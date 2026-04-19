async function createContestEntry(bill) {
  const { bill_no, customer_name, total_amount } = bill;

  // prevent duplicate
  const { data: existing } = await supabase
    .from('contest_entries')
    .select('*')
    .eq('bill_no', bill_no);

  if (existing && existing.length > 0) return;

  // insert
  await supabase.from('contest_entries').insert({
    bill_no,
    customer_name,
    amount: total_amount
  });

  // update counter
  const { data: meta } = await supabase
    .from('contest_meta')
    .select('*')
    .eq('id', 1)
    .single();

  await supabase
    .from('contest_meta')
    .update({ current: meta.current + 1 })
    .eq('id', 1);
}