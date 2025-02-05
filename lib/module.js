import escape from 'lodash.escape'
import JSZip from 'jszip'
import FileSaver from 'file-saver'
const CELL_TYPE_STRING = 'string',
	CELL_TYPE_NUMBER = 'number',
	validTypes = ['string', 'number'],
	MISSING_KEY_FILENAME = 'Zipclex config missing property filename',
	INVALID_TYPE_FILENAME = 'Zipclex filename can only be of type string',
	INVALID_TYPE_SHEET = 'Zipcelx sheet data is not of type array',
	INVALID_TYPE_SHEET_DATA = 'Zipclex sheet data childs is not of type array',
	WARNING_INVALID_TYPE = 'Invalid type supplied in cell config, falling back to "string"',
	childValidator = (e) => e.every((e) => Array.isArray(e))
var validator = (e) =>
	e.filename
		? 'string' != typeof e.filename
			? (console.error(INVALID_TYPE_FILENAME), !1)
			: Array.isArray(e.sheet.data)
			? !!childValidator(e.sheet.data) || (console.error(INVALID_TYPE_SHEET_DATA), !1)
			: (console.error(INVALID_TYPE_SHEET), !1)
		: (console.error(MISSING_KEY_FILENAME), !1)
const generateColumnLetter = (e) => {
	if ('number' != typeof e) return ''
	const o = Math.floor(e / 26),
		t = String.fromCharCode(97 + (e % 26)).toUpperCase()
	return 0 === o ? t : generateColumnLetter(o - 1) + t
}
var generatorCellNumber = (e, o) => `${generateColumnLetter(e)}${o}`,
	generatorStringCell = (e, o, t) => `<c r="${generatorCellNumber(e, t)}" t="inlineStr"><is><t>${escape(o)}</t></is></c>`,
	generatorNumberCell = (e, o, t) => `<c r="${generatorCellNumber(e, t)}"><v>${o}</v></c>`,
	formatCell = (e, o, t) => (
		-1 === validTypes.indexOf(e.type) && (console.warn(WARNING_INVALID_TYPE), (e.type = 'string')),
		'string' === e.type ? generatorStringCell(o, e.value, t) : generatorNumberCell(o, e.value, t)
	),
	formatRow = (e, o) => {
		const t = o + 1,
			s = e.map((e, o) => formatCell(e, o, t)).join('')
		return `<row r="${t}">${s}</row>`
	},
	generatorRows = (e) => e.map((e, o) => formatRow(e, o)).join(''),
	workbookXML =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><workbookPr/><sheets><sheet state="visible" name="Sheet1" sheetId="1" r:id="rId3"/></sheets><definedNames/><calcPr/></workbook>',
	workbookXMLRels =
		'<?xml version="1.0" ?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n<Relationship Id="rId3" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>\n</Relationships>',
	rels =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
	contentTypes =
		'<?xml version="1.0" ?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n<Default ContentType="application/xml" Extension="xml"/>\n<Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>\n<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/sheet1.xml"/>\n<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" PartName="/xl/workbook.xml"/>\n</Types>',
	templateSheet =
		'<?xml version="1.0" ?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:mv="urn:schemas-microsoft-com:mac:vml" xmlns:mx="http://schemas.microsoft.com/office/mac/excel/2008/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main"><sheetData>{placeholder}</sheetData></worksheet>'
const generateXMLWorksheet = (e) => {
	const o = generatorRows(e)
	return templateSheet.replace('{placeholder}', o)
}
var zipcelx = (e) => {
	if (!validator(e)) throw new Error('Validation failed.')
	const o = new JSZip(),
		t = o.folder('xl')
	t.file('workbook.xml', workbookXML),
		t.file('_rels/workbook.xml.rels', workbookXMLRels),
		o.file('_rels/.rels', rels),
		o.file('[Content_Types].xml', contentTypes)
	const s = generateXMLWorksheet(e.sheet.data)
	return (
		t.file('worksheets/sheet1.xml', s),
		o
			.generateAsync({
				type: 'blob',
				mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			})
			.then((o) => {
				if (window.flutter_inappwebview) {
					var reader = new FileReader()
					console.log('webview detected')

					reader.readAsDataURL(o)
					reader.onloadend = function () {
						var dataUrl = reader.result
						var base64 = dataUrl.split(',')[1]

						window.flutter_inappwebview.callHandler('blobToBase64Handler', base64.toString(), 'xlsx', e.filename)
					}
				} else {
					console.log('saving with filesaver')
					FileSaver.saveAs(o, `${e.filename}.xlsx`)
				}
			})
	)
}
export default zipcelx
export { generateXMLWorksheet }
