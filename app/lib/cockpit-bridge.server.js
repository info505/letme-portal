import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from './prisma.server.js';

// This is a server-to-server API for the authenticated Let Me Bowl Cockpit, not a public customer API.
// No passwords, sessions, payment tokens or unrestricted database records are ever returned.
const ENDPOINT = '/api/cockpit/v1';
const MAX_CLOCK_SKEW = 5 * 60 * 1000;
const usedNonces = new Map();
const permittedOperations = new Set([
  'overview', 'dashboard', 'customers', 'orders', 'invoices', 'customer',
  'update_customer', 'save_billing', 'save_address', 'save_contact', 'save_cost_center',
  'update_order', 'update_invoice',
]);
const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const time = value => value instanceof Date ? value.toISOString() : value ? String(value) : null;
const money = value => value === null || value === undefined ? null : String(value);
const text = (value, max = 300) => {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw fail('invalid');
  return value.trim();
};
const optional = (value, max = 300) => value === null || value === undefined ? null : text(value, max) || null;
const required = (value, max = 300) => { const v = text(value, max); if (!v) throw fail('invalid'); return v; };
const id = value => required(value, 100);
const safeFields = value => value && typeof value === 'object' && !Array.isArray(value) ? value : (() => { throw fail('invalid'); })();
const iso = value => { if (typeof value !== 'string' || !value || !Number.isFinite(Date.parse(value))) throw fail('invalid'); return new Date(value).toISOString(); };
const matches = (row, expected) => time(row.updatedAt) === iso(expected);
const userSelect = { id:true, companyName:true, firstName:true, lastName:true, email:true, username:true,
  phone:true, isActive:true, isAdmin:true, role:true, invoicePurchaseEnabled:true, mustResetPassword:true,
  createdAt:true, updatedAt:true };
const user = row => ({ ...row, createdAt:time(row.createdAt), updatedAt:time(row.updatedAt) });
const record = row => row ? Object.fromEntries(Object.entries(row).filter(([k]) => !['userId','locationId'].includes(k))
  .map(([key,value]) => [key,value instanceof Date ? value.toISOString() : value])) : null;
const order = row => ({ id:row.id, userId:row.userId, orderNumber:row.orderNumber, status:row.status,
  totalAmount:money(row.totalAmount) ?? '0', currency:row.currency, orderedAt:time(row.orderedAt),
  deliveryDate:time(row.deliveryDate), deliveryTime:row.deliveryTime, deliveryStreet:row.deliveryStreet,
  deliveryPostalCode:row.deliveryPostalCode, deliveryCity:row.deliveryCity, customerNote:row.customerNote,
  updatedAt:time(row.updatedAt), ...(row.user ? {user:{companyName:row.user.companyName,
    firstName:row.user.firstName,lastName:row.user.lastName,isAdmin:row.user.isAdmin}}:{}),
  items:(row.items||[]).map(item=>({id:item.id,title:item.title,quantity:item.quantity,unit:item.unit,
    unitPrice:money(item.unitPrice),totalPrice:money(item.totalPrice)})) });
const invoice = row => ({ id:row.id, userId:row.userId, invoiceNumber:row.invoiceNumber,
  title:row.title, issueDate:time(row.issueDate), dueDate:time(row.dueDate), amountGross:money(row.amountGross),
  status:row.status, updatedAt:time(row.updatedAt), ...(row.user ? {user:{companyName:row.user.companyName,
    firstName:row.user.firstName,lastName:row.user.lastName,isAdmin:row.user.isAdmin}}:{}) });
const orderUser = { companyName:true, firstName:true, lastName:true, isAdmin:true };
const listArgs = input => ({ q:optional(input.q,100) || '', page:Math.max(1,Math.min(1000,Number.isSafeInteger(input.page)?input.page:1)), take:30 });
const paged = (total,page,take,rows) => ({ total, page, pages:Math.max(1,Math.ceil(total/take)), rows });

async function read(input) {
  const op = input.op;
  if (op === 'overview') {
    const [customers,active,pending,orders,invoices] = await Promise.all([
      prisma.portalUser.count({where:{isAdmin:false}}),
      prisma.portalUser.count({where:{isAdmin:false,isActive:true}}),
      prisma.portalUser.count({where:{isAdmin:false,isActive:false}}),
      prisma.portalOrder.count({where:{user:{isAdmin:false}}}),
      prisma.portalInvoice.count({where:{user:{isAdmin:false}}}),
    ]);
    return { customers,active,pending,orders,invoices,
      mailProvider:process.env.MAIL_PROVIDER === 'brevo' ? 'brevo' : 'mailjet',
      brevoConfigured:Boolean(process.env.BREVO_API_KEY), portalUrl:'https://konto.letmebowl-catering.de' };
  }
  if (op === 'dashboard') {
    // The dashboard is read-only and always excludes administrators. Keep orders
    // and invoices separate: totals here are not payment reconciliations.
    const [summary, openOrders, orderSums, outstandingInvoices, recentOrders, recentInvoices, recentCustomers] = await Promise.all([
      read({op:'overview'}),
      prisma.portalOrder.count({where:{user:{isAdmin:false},status:{in:['OPEN','CONFIRMED','IN_PREPARATION']}}}),
      prisma.portalOrder.aggregate({where:{user:{isAdmin:false}},_sum:{totalAmount:true}}),
      prisma.portalInvoice.aggregate({where:{user:{isAdmin:false},status:{in:['OFFEN','UEBERFAELLIG']}},_sum:{amountGross:true}}),
      prisma.portalOrder.findMany({where:{user:{isAdmin:false}},
        include:{user:{select:orderUser},items:{select:{id:true,title:true,quantity:true,unit:true,unitPrice:true,totalPrice:true}}},
        orderBy:{orderedAt:'desc'},take:6}),
      prisma.portalInvoice.findMany({where:{user:{isAdmin:false}},include:{user:{select:orderUser}},
        orderBy:{createdAt:'desc'},take:5}),
      prisma.portalUser.findMany({where:{isAdmin:false},select:userSelect,orderBy:{createdAt:'desc'},take:5}),
    ]);
    return {...summary, openOrders, totalOrderValue:money(orderSums._sum.totalAmount)??'0',
      outstandingInvoiceAmount:money(outstandingInvoices._sum.amountGross)??'0',
      recentOrders:recentOrders.map(order),recentInvoices:recentInvoices.map(invoice),
      recentCustomers:recentCustomers.map(user), asOf:new Date().toISOString()};
  }
  if (op === 'customers') {
    const {q,page,take}=listArgs(input);
    const where={isAdmin:false,...(q?{OR:[{companyName:{contains:q,mode:'insensitive'}},
      {firstName:{contains:q,mode:'insensitive'}},{lastName:{contains:q,mode:'insensitive'}},
      {email:{contains:q,mode:'insensitive'}}]}:{})};
    const [total,rows]=await Promise.all([prisma.portalUser.count({where}),prisma.portalUser.findMany({where,
      select:userSelect,orderBy:{createdAt:'desc'},skip:(page-1)*take,take})]);
    return paged(total,page,take,rows.map(user));
  }
  if (op === 'orders') {
    const {q,page,take}=listArgs(input);
    const where={user:{isAdmin:false},...(q?{OR:[{orderNumber:{contains:q,mode:'insensitive'}},
      {user:{companyName:{contains:q,mode:'insensitive'}}}]}:{})};
    const [total,rows]=await Promise.all([prisma.portalOrder.count({where}),prisma.portalOrder.findMany({where,
      include:{user:{select:orderUser},items:{select:{id:true,title:true,quantity:true,unit:true,unitPrice:true,totalPrice:true}}},
      orderBy:{orderedAt:'desc'},skip:(page-1)*take,take})]);
    return paged(total,page,take,rows.map(order));
  }
  if (op === 'invoices') {
    const {q,page,take}=listArgs(input);
    const where={user:{isAdmin:false},...(q?{OR:[{invoiceNumber:{contains:q,mode:'insensitive'}},
      {title:{contains:q,mode:'insensitive'}},{user:{companyName:{contains:q,mode:'insensitive'}}}]}:{})};
    const [total,rows]=await Promise.all([prisma.portalInvoice.count({where}),prisma.portalInvoice.findMany({where,
      include:{user:{select:orderUser}},orderBy:{createdAt:'desc'},skip:(page-1)*take,take})]);
    return paged(total,page,take,rows.map(invoice));
  }
  if (op === 'customer') {
    const customerId=id(input.id);
    const found=await prisma.portalUser.findUnique({where:{id:customerId},select:{...userSelect,
      billing:true, addresses:{orderBy:{createdAt:'desc'}},contacts:{orderBy:{createdAt:'desc'}},
      costCenters:{orderBy:{createdAt:'desc'}},
      orders:{orderBy:{orderedAt:'desc'},take:100,include:{items:{select:{id:true,title:true,quantity:true,unit:true,unitPrice:true,totalPrice:true}}}},
      invoices:{orderBy:{createdAt:'desc'},take:100}}});
    if(!found || found.isAdmin) throw fail('missing',404);
    const {billing,addresses,contacts,costCenters,orders,invoices,...customer}=found;
    return {...user(customer), billing:record(billing),addresses:addresses.map(record),
      contacts:contacts.map(record),costCenters:costCenters.map(record),orders:orders.map(order),invoices:invoices.map(invoice)};
  }
  throw fail('invalid');
}

async function edit(input) {
  const {op}=input, targetId=id(input.id), fields=safeFields(input.fields ?? {});
  if (op==='update_order' || op==='update_invoice') {
    const invoiceUpdate=op==='update_invoice';
    const allowed=invoiceUpdate?['OFFEN','BEZAHLT','UEBERFAELLIG']:['OPEN','CONFIRMED','IN_PREPARATION','DELIVERED','CANCELLED'];
    if(!allowed.includes(input.status))throw fail('invalid');
    const model=invoiceUpdate?prisma.portalInvoice:prisma.portalOrder;
    const found=await model.findUnique({where:{id:targetId},select:{updatedAt:true,user:{select:{isAdmin:true}}}});
    if(!found)throw fail('missing',404);
    if(found.user.isAdmin || !matches(found,input.expectedUpdatedAt))throw fail('stale_or_admin',409);
    const changed=await model.updateMany({where:{id:targetId,updatedAt:found.updatedAt,user:{isAdmin:false}},data:{status:input.status}});
    if(changed.count!==1)throw fail('stale_or_admin',409);
    return {updated:true};
  }
  return prisma.$transaction(async tx=>{
    const owner=await tx.portalUser.findUnique({where:{id:targetId},select:{id:true,isAdmin:true,updatedAt:true}});
    if(!owner)throw fail('missing',404);
    if(owner.isAdmin || !matches(owner,input.expectedUpdatedAt))throw fail('stale_or_admin',409);
    if(op==='update_customer') {
      if(typeof input.isActive!=='boolean' || typeof input.invoicePurchaseEnabled!=='boolean') throw fail('invalid');
      const data={companyName:required(fields.companyName),firstName:text(fields.firstName ?? ""),
        lastName:text(fields.lastName ?? ""),phone:optional(fields.phone),isActive:input.isActive,
        invoicePurchaseEnabled:input.invoicePurchaseEnabled};
      const updated=await tx.portalUser.updateMany({where:{id:targetId,updatedAt:owner.updatedAt,isAdmin:false},data});
      if(updated.count!==1)throw fail('stale_or_admin',409);
      return {updated:true};
    }
    const choices={
      save_billing:()=>({model:tx.billingProfile, fields:{companyName:optional(fields.companyName),contactName:optional(fields.contactName),
        email:optional(fields.email),invoiceEmail:optional(fields.invoiceEmail),phone:optional(fields.phone),
        street:optional(fields.street),houseNumber:optional(fields.houseNumber),postalCode:optional(fields.postalCode),
        city:optional(fields.city),country:optional(fields.country),vatId:optional(fields.vatId)}}),
      save_address:()=>({model:tx.deliveryAddress,fields:{label:optional(fields.label),companyName:optional(fields.companyName),
        contactName:optional(fields.contactName),phone:optional(fields.phone),street:required(fields.street),
        houseNumber:optional(fields.houseNumber),postalCode:required(fields.postalCode),city:required(fields.city),
        country:required(fields.country),notes:optional(fields.notes,4000)}}),
      save_contact:()=>({model:tx.portalContact,fields:{firstName:required(fields.firstName),lastName:optional(fields.lastName),
        email:required(fields.email),phone:optional(fields.phone),roleLabel:optional(fields.roleLabel),
        department:optional(fields.department)}}),
      save_cost_center:()=>({model:tx.costCenter,fields:{name:required(fields.name),code:optional(fields.code),
        description:optional(fields.description,4000)}}),
    };
    const createConfig=choices[op];if(!createConfig)throw fail('invalid');
    const config=createConfig();
    const recordId=optional(input.recordId,100);
    const existing=recordId ? await config.model.findUnique({where:{id:recordId},select:{id:true,userId:true,updatedAt:true}})
      : op==='save_billing' ? await tx.billingProfile.findUnique({where:{userId:targetId},select:{id:true,userId:true,updatedAt:true}}) : null;
    if(recordId && (!existing || existing.userId!==targetId))throw fail('missing',404);
    if(existing) {
      if(existing.userId!==targetId || !matches(existing,input.expectedRecordUpdatedAt))throw fail('stale_or_admin',409);
      const changed=await config.model.updateMany({where:{id:existing.id,userId:targetId,updatedAt:existing.updatedAt},data:config.fields});
      if(changed.count!==1)throw fail('stale_or_admin',409);
    } else {
      if(op==='save_billing')await tx.billingProfile.create({data:{...config.fields,userId:targetId}});
      else await config.model.create({data:{...config.fields,userId:targetId}});
    }
    return {updated:true};
  });
}

export async function dispatchCockpitBridge(input) {
  if(!input || typeof input!=='object' || Array.isArray(input) || !permittedOperations.has(input.op))throw fail('invalid');
  if(['overview','dashboard','customers','orders','invoices','customer'].includes(input.op))return read(input);
  return edit(input);
}

export function verifyCockpitBridge(request, raw) {
  const secret=process.env.PORTAL_COCKPIT_BRIDGE_SECRET || '';
  if(!/^[a-f0-9]{64,128}$/i.test(secret))throw fail('not_configured',503);
  if(!Buffer.isBuffer(raw) || raw.length<2 || raw.length>65536)throw fail('invalid');
  const timestamp=request.get('X-LMB-Timestamp') || '';
  const nonce=request.get('X-LMB-Nonce') || '';
  const signature=request.get('X-LMB-Signature') || '';
  if(!/^\d{13}$/.test(timestamp) || Math.abs(Date.now()-Number(timestamp))>MAX_CLOCK_SKEW ||
    !/^[a-f0-9]{48}$/i.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature))throw fail('unauthorized',401);
  const now=Date.now();
  for(const [key,until] of usedNonces)if(until<now)usedNonces.delete(key);
  if(usedNonces.has(nonce))throw fail('unauthorized',401);
  const digest=createHash('sha256').update(raw).digest('hex');
  const expected=createHmac('sha256',secret).update(`v1\nPOST\n${ENDPOINT}\n${timestamp}\n${nonce}\n${digest}`).digest('hex');
  if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))throw fail('unauthorized',401);
  usedNonces.set(nonce,now+MAX_CLOCK_SKEW);
}

export function bridgeError(error) {
  if(['unauthorized','not_configured','invalid','missing','stale_or_admin'].includes(error?.code))
    return {status:error.status || 400,code:error.code};
  if(error?.code==='P2002')return {status:409,code:'stale_or_admin'};
  return {status:503,code:'unavailable'};
}