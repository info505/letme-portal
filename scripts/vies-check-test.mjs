import assert from "node:assert/strict";
import { checkViesVat, normalizeVatId } from "../app/lib/vies-check.server.js";

assert.deepEqual(normalizeVatId("DE 123-456-789"), {
  countryCode:"DE",vatNumber:"123456789",complete:"DE123456789",
});
assert.equal(normalizeVatId("not-a-number"),null);
assert.equal(normalizeVatId(""),null);
let requests=0;
const mock = payload => async (url,opts) => {
  requests++;
  assert.equal(url,"https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number");
  assert.equal(opts.method,"POST");
  assert.deepEqual(JSON.parse(opts.body),{countryCode:"DE",vatNumber:"123456789"});
  return {ok:true,json:async()=>payload};
};
assert.deepEqual(await checkViesVat("DE123456789",mock({valid:true,countryCode:"DE",vatNumber:"123456789"})),{
  status:"valid",reference:null,
});
assert.deepEqual(await checkViesVat("DE123456789",mock({valid:false,countryCode:"DE",vatNumber:"123456789"})),{
  status:"invalid",reference:null,
});
assert.equal((await checkViesVat("DE123456789",mock({valid:false,userError:"MS_UNAVAILABLE"}))).status,"unavailable");
assert.equal((await checkViesVat("DE123456789",mock({valid:true,countryCode:"FR",vatNumber:"123456789"}))).status,"unavailable");
assert.equal((await checkViesVat("DE123456789",mock({valid:true,errorWrappers:[{error:"BUSY"}]}))).status,"unavailable");
const before=requests;
assert.equal((await checkViesVat("DE/not-valid",mock({valid:true}))).status,"invalid_format");
assert.equal(requests,before,"Invalid VAT format must not contact VIES");
console.log("VIES checks passed: valid, invalid, unavailable, mismatch, malformed and country validation.");
