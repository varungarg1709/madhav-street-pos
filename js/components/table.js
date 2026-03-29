function debounce(fn, delay = 250){

  let timer

  return function(...args){

    clearTimeout(timer)

    timer = setTimeout(()=>{
      fn.apply(this,args)
    }, delay)

  }

}

function createTable(config){

  const container =
    document.querySelector(config.container)

  if(!container) return

  const state = {
    data: config.data || [],
    filtered: [],
    page: 1,
    pageSize: config.pageSize || 10,
    sortField: null,
    sortDir: "asc",
    selected: new Set(),
    search:""
  }

  function applyFilters(){

    let rows = [...state.data]

    /* GLOBAL SEARCH */

    if(state.search){

      const s = state.search.toLowerCase()

      rows = rows.filter(r =>
        Object.values(r).some(v =>
          String(v).toLowerCase().includes(s)
        )
      )

    }

    /* SORT */

    if(state.sortField){

      rows.sort((a,b)=>{

        const x = a[state.sortField]
        const y = b[state.sortField]

        if(x < y) return state.sortDir==="asc"?-1:1
        if(x > y) return state.sortDir==="asc"?1:-1

        return 0
      })

    }

    state.filtered = rows
  }

  function render(){

    applyFilters()

    const rows = state.filtered

    const start =
      (state.page-1) * state.pageSize

    const paged =
      rows.slice(start,start+state.pageSize)

    const totalPages =
      Math.ceil(rows.length / state.pageSize)

    let html = `

<div class="ms-table">

<div class="ms-table-toolbar">

<input
  class="ms-search"
  placeholder="Search..."
  value="${state.search}"
>

<button class="ms-export">
Export CSV
</button>

<select class="ms-pagesize">
<option ${state.pageSize==10?"selected":""}>10</option>
<option ${state.pageSize==25?"selected":""}>25</option>
<option ${state.pageSize==50?"selected":""}>50</option>
<option ${state.pageSize==100?"selected":""}>100</option>
</select>

</div>

<div class="ms-table-scroll">

<table>

<thead>
<tr>

<th>
<input type="checkbox" id="msSelectAll">
</th>

<th>#</th>
`

config.columns.forEach(col=>{

  html += `
<th class="ms-sort"
    data-field="${col.field}">
${col.label}
</th>
`
})

html += `
</tr>
</thead>

<tbody>
`

paged.forEach((row,i)=>{

  const index = start+i+1

  html += `
<tr data-index="${index}">
`

html += `
<td>
<input type="checkbox"
class="ms-row-check"
value="${row.phone || index}">
</td>
`

html += `<td>${index}</td>`

config.columns.forEach(col=>{

  let value = row[col.field]

  if(col.format)
    value = col.format(value,row)

  html += `<td>${value ?? ""}</td>`

})

html += `</tr>`
})

html += `
</tbody>
</table>

</div>

<div class="ms-pagination">

<button class="ms-prev">Prev</button>

<span>
Page ${state.page} / ${totalPages || 1}
</span>

<button class="ms-next">Next</button>

</div>

</div>
`

container.innerHTML = html

bindEvents(totalPages)
  }

  function bindEvents(totalPages){

  /* SEARCH */

  const search =
    container.querySelector(".ms-search")

  const handleSearch = debounce((value,cursorPos)=>{

  state.search = value
  state.page = 1

  render()

  const newSearch =
    container.querySelector(".ms-search")

  if(newSearch){

    newSearch.focus()
    newSearch.setSelectionRange(cursorPos,cursorPos)

  }

}, 300)


search.oninput = e=>{

  const value = e.target.value
  const cursorPos = e.target.selectionStart

  handleSearch(value,cursorPos)

}

  /* PAGE SIZE */

  container
  .querySelector(".ms-pagesize")
  .onchange = e=>{

    state.pageSize =
      Number(e.target.value)

    state.page = 1
    render()

  }

  /* SORT */

  container
  .querySelectorAll(".ms-sort")
  .forEach(th=>{

    th.onclick = ()=>{

      const field =
        th.dataset.field

      if(state.sortField===field)
        state.sortDir =
          state.sortDir==="asc"?"desc":"asc"
      else{
        state.sortField=field
        state.sortDir="asc"
      }

      render()

    }

  })

  /* PAGINATION */

  container
  .querySelector(".ms-prev")
  .onclick = ()=>{

    if(state.page>1){
      state.page--
      render()
    }

  }

  container
  .querySelector(".ms-next")
  .onclick = ()=>{

    if(state.page<totalPages){
      state.page++
      render()
    }

  }

  /* SELECT ALL */

  const selectAll =
    container.querySelector("#msSelectAll")

  selectAll.onclick = ()=>{

    container
    .querySelectorAll(".ms-row-check")
    .forEach(cb=>{
      cb.checked = selectAll.checked
    })

  }

  /* CSV EXPORT */

  container
  .querySelector(".ms-export")
  .onclick = exportCSV

  }

  function exportCSV(){

    const rows = state.filtered

    let csv = config.columns
      .map(c=>c.label)
      .join(",")

    csv += "\n"

    rows.forEach(r=>{

      csv += config.columns
        .map(c=>r[c.field])
        .join(",")

      csv += "\n"

    })

    const blob =
      new Blob([csv],{type:"text/csv"})

    const a =
      document.createElement("a")

    a.href = URL.createObjectURL(blob)
    a.download = "export.csv"

    a.click()
  }

  render()
}

window.createTable = createTable