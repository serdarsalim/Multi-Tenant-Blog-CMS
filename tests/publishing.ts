import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
const calls: RequestInit[] = [];
globalThis.fetch = async (_input, init) => { calls.push(init || {}); return new Response('[]', {headers:{'Content-Type':'application/json'}}); };
async function main() {
  const {supabase} = await import('../src/lib/supabase');
  await supabase.from('posts').select('*');
  const options = calls.pop() as RequestInit & {next:{tags:string[];revalidate:number}};
  assert.ok(options.next.tags.includes('posts')); assert.equal(options.next.revalidate,60);
  const {getServiceRoleClient} = await import('../src/lib/supabase-admin');
  await getServiceRoleClient().from('posts').select('*'); assert.equal(calls.pop()?.cache,'no-store');
  const {validatePublishInput} = await import('../src/lib/publish');
  const base={title:'Title',html:'<p>Body</p>'};
  assert.equal(validatePublishInput(base).featuredImage,undefined);
  assert.equal(validatePublishInput({...base,featuredImage:''}).featuredImage,'');
  assert.equal(validatePublishInput({...base,featuredImage:'https://images.test/cover.webp'}).featuredImage,'https://images.test/cover.webp');
  assert.throws(()=>validatePublishInput({...base,featuredImage:'javascript:alert(1)'}));
  console.log('PASS: tagged public reads, uncached management reads, featured-image validation and clearing. All requests mocked.');
}
void main();
