import { randomUUID } from "node:crypto";
import { brandedEmailText, emailTextParagraphs, renderBrandedEmail, safeEmailUrl, EMAIL_BRAND_VERSION } from "./email-layout.server.js";

const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const isEmail = value => typeof value === "string" && value.length <= 254 && emailPattern.test(value);
const cleanHeader = (value, limit = 300) => { const result = String(value || "").trim(); if (result.length > limit || /[\u0000-\u001f\u007f]/.test(result)) throw new Error("mail_header_invalid"); return result; };
const legacyKeys = () => ({ apiKey: process.env.MAILJET_API_KEY || process.env.MJ_APIKEY_PUBLIC || process.env.SMTP_USER || "", secretKey: process.env.MAILJET_SECRET_KEY || process.env.MJ_APIKEY_PRIVATE || process.env.SMTP_PASS || "" });

/** Safe administrative summary: it never returns API credentials. */
export function getPortalMailConfiguration() {
  const fromEmail = String(process.env.MAIL_FROM_EMAIL || process.env.MAILJET_FROM_EMAIL || "info@letmebowl-catering.de").trim();
  const fromName = String(process.env.MAIL_FROM_NAME || process.env.MAILJET_FROM_NAME || "Let Me Bowl").trim();
  const ownerEmail = String(process.env.ORDER_NOTIFICATION_EMAIL || process.env.ORDER_MAIL_TO || "info@letmebowl-catering.de").trim();
  const bccEmail = String(process.env.MAIL_BCC || "").trim();
  const desired = String(process.env.MAIL_PROVIDER || "").trim().toLowerCase();
  const brevoKeyReady = /^[A-Za-z0-9_-]{20,512}$/.test(process.env.BREVO_API_KEY || "");
  const {apiKey, secretKey} = legacyKeys();
  const provider = desired === "brevo" && brevoKeyReady ? "brevo" : "mailjet";
  const validFrom = isEmail(fromEmail) && Boolean(fromName) && fromName.length <= 120 && !/[\u0000-\u001f\u007f]/.test(fromName);
  const missing = [];
  const brevoMissing = [];
  if (desired !== "brevo") brevoMissing.push("MAIL_PROVIDER=brevo");
  if (!brevoKeyReady) brevoMissing.push("BREVO_API_KEY");
  if (!validFrom) brevoMissing.push("MAIL_FROM_EMAIL / MAIL_FROM_NAME");
  if (desired && !["brevo","mailjet"].includes(desired)) missing.push("MAIL_PROVIDER");
  if (!validFrom) missing.push("MAIL_FROM_EMAIL / MAIL_FROM_NAME");
  if (provider === "mailjet" && (!apiKey || !secretKey)) missing.push(...brevoMissing);
  return {provider, configured: missing.length === 0, fromEmail, fromName, ownerEmail, bccEmail,
    hasApiKey: provider === "brevo" ? brevoKeyReady : Boolean(apiKey), hasSecretKey: provider === "brevo" ? false : Boolean(secretKey),
    migrationPending: provider !== "brevo", brevoMissing, missing};
}

function normalizeRecipients(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  if (values.length > 99) throw new Error("mail_recipients_limit");
  return values.map(item => {
    const email = String(typeof item === "string" ? item : item?.email || item?.Email || "").trim();
    const name = typeof item === "object" && item ? cleanHeader(item.name || item.Name || "", 120) : "";
    if (!isEmail(email)) throw new Error("mail_recipient_invalid");
    return {email, ...(name ? {name} : {})};
  });
}
function legacyPlainText(html) {
  return String(html || "").replace(/<(?:style|script|head)\b[^>]*>[\s\S]*?<\/(?:style|script|head)>/gi, "")
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|tr|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&#039;/g,"'").trim();
}
function htmlLinks(html) {
  const result = [];
  for (const match of String(html || "").matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    try { const url = safeEmailUrl(match[2].replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"')); if (!result.includes(url)) result.push(url); } catch { /* No unsafe URL can become an email action. */ }
  }
  return result;
}
function brandedContent({subject, text, html, locale="de"}) {
  const suppliedText = String(text || "").trim() || legacyPlainText(html);
  const links = htmlLinks(html).filter(url => !suppliedText.includes(url));
  const plain = [suppliedText, ...links].filter(Boolean).join("\n\n");
  if (!plain) throw new Error("mail_body_missing");
  const alreadyBranded = String(html || "").includes(`data-lmb-email="${EMAIL_BRAND_VERSION}"`);
  let action = null;
  const firstLink = [...plain.matchAll(/https:\/\/[^\s<>]+/g)].map(match => match[0]).find(value => {
    try { return new URL(value).origin === "https://konto.letmebowl-catering.de"; } catch { return false; }
  });
  if (firstLink) action = {url: firstLink, label: locale === "en" ? "Open your account" : "Kundenkonto öffnen"};
  return {text: plain.includes("Goerzallee 299 · 14167 Berlin") ? plain : brandedEmailText(plain,locale),
    html: alreadyBranded ? String(html) : renderBrandedEmail({title:subject,preheader:suppliedText.slice(0,150),bodyHtml:emailTextParagraphs(plain),locale,action})};
}
async function boundedJson(response) {
  if (!response.body) return {};
  const reader = response.body.getReader(); const chunks=[];let length=0;
  try { while(true) { const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>65536){await reader.cancel();return {};}chunks.push(part.value); }
    try{const parsed=JSON.parse(Buffer.concat(chunks).toString("utf8"));return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};}catch{return {};}
  } finally {reader.releaseLock();}
}

/** No retries and no provider fallback after a request has been sent. Tests inject a mock fetch. */
export async function sendMail({to,subject,html,text,replyTo,cc,bcc,locale="de",idempotencyKey}, {fetcher=fetch}={}) {
  const config = getPortalMailConfiguration();
  if (!config.configured) throw new Error("mail_configuration_incomplete");
  const recipients=normalizeRecipients(to), copies=normalizeRecipients(cc), blindCopies=normalizeRecipients(bcc), reply=normalizeRecipients(replyTo);
  if (!recipients.length) throw new Error("mail_recipient_missing");
  if (reply.length>1) throw new Error("mail_reply_to_invalid");
  const title=cleanHeader(subject);if(!title)throw new Error("mail_subject_missing");
  const content=brandedContent({subject:title,text,html,locale});
  if(content.html.length>400000||content.text.length>200000)throw new Error("mail_body_limit");
  const key=idempotencyKey || randomUUID();
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))throw new Error("mail_idempotency_invalid");
  let url, headers, body;
  if(config.provider==="brevo") {
    url="https://api.brevo.com/v3/smtp/email";
    headers={"api-key":process.env.BREVO_API_KEY,Accept:"application/json","Content-Type":"application/json"};
    body={sender:{email:config.fromEmail,name:config.fromName},to:recipients,subject:title,htmlContent:content.html,textContent:content.text,
      ...(copies.length?{cc:copies}:{}),...(blindCopies.length?{bcc:blindCopies}:{}),...(reply.length?{replyTo:reply[0]}:{}),headers:{idempotencyKey:key},tags:["let-me-bowl","kundenportal"]};
  } else {
    const keys=legacyKeys(), mapped=items=>items.map(item=>({Email:item.email,...(item.name?{Name:item.name}:{})}));
    url="https://api.mailjet.com/v3.1/send";
    headers={Authorization:`Basic ${Buffer.from(`${keys.apiKey}:${keys.secretKey}`).toString("base64")}`,"Content-Type":"application/json"};
    body={Messages:[{From:{Email:config.fromEmail,Name:config.fromName},To:mapped(recipients),Subject:title,HTMLPart:content.html,TextPart:content.text,
      ...(copies.length?{Cc:mapped(copies)}:{}),...(blindCopies.length?{Bcc:mapped(blindCopies)}:{}),...(reply.length?{ReplyTo:mapped(reply)[0]}:{})}]};
  }
  let response, result;
  try {response=await fetcher(url,{method:"POST",headers,body:JSON.stringify(body),redirect:"error",cache:"no-store",signal:AbortSignal.timeout(10000)});result=await boundedJson(response);}
  catch{throw new Error("mail_send_uncertain");}
  if(!response.ok)throw new Error(response.status===429?"mail_rate_limited":response.status>=500||response.status===408?"mail_send_uncertain":`mail_provider_rejected_${response.status}`);
  if(config.provider==="brevo") {
    if(typeof result.messageId!=="string"||! /^[<>A-Za-z0-9._@+\/-]{1,512}$/.test(result.messageId))throw new Error("mail_send_uncertain");
    return {accepted:true,provider:"brevo",providerIds:[result.messageId]};
  }
  if(!Array.isArray(result.Messages)||result.Messages.length!==1||result.Messages[0].Status!=="success")throw new Error("mail_send_uncertain");
  const ids = (result.Messages[0].To || []).map(item=>String(item.MessageID||item.MessageUUID||"")).filter(Boolean);
  return {accepted:true,provider:"mailjet",providerIds:ids};
}

/** Adapter for existing order/admin callers; preserving recipients and reply-to without exposing provider responses. */
export async function sendPortalMailMessages(messages, dependencies={}) {
  if(!Array.isArray(messages)||!messages.length||messages.length>10)return {sent:false,reason:"mail_messages_invalid"};
  const config=getPortalMailConfiguration();
  if(!config.configured)return {sent:false,provider:config.provider,reason:"mail_configuration_incomplete"};
  const results=[];
  for(const message of messages) {
    try {results.push(await sendMail({to:message.To,cc:message.Cc,bcc:message.Bcc,replyTo:message.ReplyTo,subject:message.Subject,
      html:message.HTMLPart,text:message.TextPart,locale:message.Locale||"de",idempotencyKey:message.IdempotencyKey},dependencies));}
    catch(error) {return {sent:false,provider:config.provider,reason:/^mail_[a-z_0-9]+$/.test(error?.message||"")?error.message:"mail_send_failed",acceptedCount:results.length};}
  }
  return {sent:true,provider:config.provider,results};
}
