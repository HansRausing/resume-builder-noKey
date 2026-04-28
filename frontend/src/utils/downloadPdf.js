/**
 * Download PDF file bytes in the browser.
 * @param {ArrayBuffer|Uint8Array} pdfBytes
 * @param {string} filename
 */
export const downloadPDF = (pdfBytes, filename = 'resume.pdf') => {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

