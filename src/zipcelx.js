import JSZip from 'jszip'
import FileSaver from 'file-saver'

import validator from './validator'
import generatorRows from './formatters/rows/generatorRows'

import workbookXML from './statics/workbook.xml'
import workbookXMLRels from './statics/workbook.xml.rels'
import rels from './statics/rels'
import contentTypes from './statics/[Content_Types].xml'
import templateSheet from './templates/worksheet.xml'

export const generateXMLWorksheet = (rows) => {
	const XMLRows = generatorRows(rows)
	return templateSheet.replace('{placeholder}', XMLRows)
}

export default (config) => {
	if (!validator(config)) {
		throw new Error('Validation failed.')
	}

	const zip = new JSZip()
	const xl = zip.folder('xl')
	xl.file('workbook.xml', workbookXML)
	xl.file('_rels/workbook.xml.rels', workbookXMLRels)
	zip.file('_rels/.rels', rels)
	zip.file('[Content_Types].xml', contentTypes)

	const worksheet = generateXMLWorksheet(config.sheet.data)
	xl.file('worksheets/sheet1.xml', worksheet)

	return zip
		.generateAsync({
			type: 'blob',
			mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		})
		.then((blob) => {
			if (window.flutter_inappwebview) {
				var reader = new FileReader()
				console.log('webview detected')
				console.log('blob', blob)
				reader.readAsDataURL(blob)
				reader.onloadend = function () {
					var dataUrl = reader.result
					var base64 = dataUrl.split(',')[1]
					console.log(base64)

					window.flutter_inappwebview.callHandler('blobToBase64Handler', base64.toString(), 'xlsx', config.filename)
				}
			} else {
				console.log('saving with filesaver')
				FileSaver.saveAs(blob, `${config.filename}.xlsx`)
			}
		})
}
