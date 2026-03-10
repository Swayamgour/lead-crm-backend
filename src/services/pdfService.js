import PDFDocument from "pdfkit"

export const generateQuotationPDF = (quotation)=>{

 const doc = new PDFDocument()

 doc.text("Quotation")

 doc.text("Customer: "+quotation.customer)

 doc.text("Total: "+quotation.total)

 return doc

}