function initInventory() {

  const list = APP_STORE.inventoryData || [];
  const tbody = document.getElementById("inventoryTableBody");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;">
          No inventory data available
        </td>
      </tr>
    `;
    return;
  }

  list.forEach((item, i) => {

    const isLowStock =
      Number(item.stock) <= Number(item.reorder);

    tbody.innerHTML += `
      <tr class="${isLowStock ? 'low-stock' : ''}">
        <td>${i+1}</td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>${item.stock}</td>
        <td>${item.unit}</td>
        <td>${item.reorder}</td>
      </tr>
    `;
  });
}

window.initInventory = initInventory;