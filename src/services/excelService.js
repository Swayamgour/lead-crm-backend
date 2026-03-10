import ExcelJS from "exceljs"

export const exportLeadsToExcel = async(leads)=>{

 const workbook = new ExcelJS.Workbook()

 const sheet = workbook.addWorksheet("Leads")

 sheet.columns = [
  {header:"Name",key:"name"},
  {header:"Phone",key:"phone"},
  {header:"Email",key:"email"},
  {header:"Status",key:"status"}
 ]

 leads.forEach(lead=>{
  sheet.addRow(lead)
 })

 return workbook.xlsx.writeBuffer()

}