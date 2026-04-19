let currentBill = null;

function openSpin(bill_no, customer_name) {
  currentBill = { bill_no, customer_name };

  document.getElementById('spinOverlay').classList.add('open');
}

async function canSpin(bill_no) {
  const { data } = await supabase
    .from('spin_results')
    .select('*')
    .eq('bill_no', bill_no);

  return (data || []).length === 0;
}

async function saveSpinResult(reward) {
  await supabase.from('spin_results').insert({
    bill_no: currentBill.bill_no,
    customer_name: currentBill.customer_name,
    reward
  });
}