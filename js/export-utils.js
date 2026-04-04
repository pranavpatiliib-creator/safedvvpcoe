// Export utilities used by the Admin dashboard.
// Exposes `window.ExportUtils` with:
// - exportToExcel(selectedEventData, allQuestions, allResponses, filename)
// - exportToPDF(selectedEventData, allQuestions, allResponses, filename)
// - exportToWord(selectedEventData, allQuestions, allResponses, filename)

(function () {
    function loadScriptOnce(src) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${src}"]`);
            if (existing) {
                if (existing.getAttribute('data-loaded') === '1') return resolve();
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => {
                script.setAttribute('data-loaded', '1');
                resolve();
            });
            script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
            document.head.appendChild(script);
        });
    }

    async function ensureLibs(kind) {
        // If CDNs are blocked (adblock/CSP/offline), we try to load them again here.
        // Uses the same URLs as `admin.html`.
        if (kind === 'xlsx' && !window.XLSX) {
            const candidates = [
                'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js',
                'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                'https://unpkg.com/xlsx/dist/xlsx.full.min.js'
            ];

            let loaded = false;
            for (const src of candidates) {
                try {
                    await loadScriptOnce(src);
                    if (window.XLSX) {
                        loaded = true;
                        break;
                    }
                } catch (e) {
                    // try next candidate
                }
            }

            if (!loaded && !window.XLSX) {
                throw new Error('Failed to load XLSX from all CDN sources');
            }
        }

        if (kind === 'pdf') {
            if (!window.jspdf?.jsPDF) {
                await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }
            // AutoTable patches jsPDF; load after jsPDF.
            if (window.jspdf?.jsPDF && typeof window.jspdf.jsPDF?.API?.autoTable !== 'function') {
                await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.34/jspdf.plugin.autotable.min.js');
            }
        }

        if (kind === 'docx') {
            const docxLib = window.docx || window.Docx;
            if (!docxLib?.Document) {
                await loadScriptOnce('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js');
            }
        }
    }

    function getDocx() {
        return window.docx || window.Docx || null;
    }

    function buildTableData(eventData, questions, responses) {
        const headers = [
            'Response ID',
            'Submitted At',
            ...(questions || []).map(q => q.question)
        ];

        const rows = (responses || []).map(r => {
            const answers = r.answers || {};
            const row = [
                String(r.id ?? ''),
                r.created_at ? new Date(r.created_at).toLocaleString() : ''
            ];
            (questions || []).forEach(q => {
                const value = answers[q.id];
                row.push(Array.isArray(value) ? value.join(', ') : (value ?? ''));
            });
            return row;
        });

        return { headers, rows, title: eventData?.title || 'Event' };
    }

    async function exportToExcel(eventData, questions, responses, filename) {
        await ensureLibs('xlsx');
        if (!window.XLSX) throw new Error('XLSX library not loaded');

        const { headers, rows, title } = buildTableData(eventData, questions, responses);
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
        window.XLSX.utils.book_append_sheet(wb, ws, 'Responses');

        const xlsxArray = window.XLSX.write(wb, {
            bookType: 'xlsx',
            type: 'array'
        });
        const blob = new Blob([xlsxArray], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank', 'noopener');

        if (!opened) {
            const fallbackLink = document.createElement('a');
            fallbackLink.href = url;
            fallbackLink.target = '_blank';
            fallbackLink.rel = 'noopener';
            document.body.appendChild(fallbackLink);
            fallbackLink.click();
            fallbackLink.remove();
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    async function exportToPDF(eventData, questions, responses, filename) {
        await ensureLibs('pdf');
        const jsPDF = window.jspdf?.jsPDF;
        if (!jsPDF) throw new Error('jsPDF library not loaded');

        const { headers, rows, title } = buildTableData(eventData, questions, responses);
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text(`${title} - Responses`, 14, 14);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 20,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [102, 126, 234] }
            });
        } else {
            // Fallback: basic text if autotable isn't present
            doc.setFontSize(10);
            doc.text('AutoTable not available. Please include jspdf-autotable.', 14, 26);
        }

        doc.save(`${filename || title}_Responses.pdf`);
    }

    async function exportToWord(eventData, questions, responses, filename) {
        await ensureLibs('docx');
        const docxLib = getDocx();
        if (!docxLib) throw new Error('docx library not loaded');

        const {
            Document,
            Packer,
            Paragraph,
            TextRun,
            Table,
            TableRow,
            TableCell,
            WidthType
        } = docxLib;

        const { headers, rows, title } = buildTableData(eventData, questions, responses);

        const tableRows = [
            new TableRow({
                children: headers.map(h => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: String(h), bold: true })] })]
                }))
            }),
            ...rows.map(r => new TableRow({
                children: r.map(v => new TableCell({
                    children: [new Paragraph(String(v ?? ''))]
                }))
            }))
        ];

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ children: [new TextRun({ text: `${title} - Responses`, bold: true, size: 32 })] }),
                    new Paragraph(''),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: tableRows
                    })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${filename || title}_Responses.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    window.ExportUtils = {
        exportToExcel,
        exportToPDF,
        exportToWord
    };
})();
