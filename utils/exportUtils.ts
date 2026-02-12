
import JSZip from 'jszip';
import { Project, Chapter } from '../types';

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

export const downloadTxt = (project: Project, chapters: Chapter[]) => {
    let content = `${project.title}\n`;
    content += `Tác giả: ${project.author}\n`;
    content += `Thể loại: ${project.genres.join(', ')}\n`;
    content += `Giới thiệu:\n${project.description}\n\n`;
    content += `--------------------------------------------------\n\n`;

    const sortedChapters = [...chapters].sort((a, b) => a.index - b.index);

    sortedChapters.forEach(chapter => {
        const title = chapter.titleTranslated || chapter.titleOriginal;
        const body = chapter.contentTranslated || chapter.contentRaw || "";
        content += `Chương ${chapter.index}: ${title}\n\n`;
        content += `${body}\n\n`;
        content += `--------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(project.title)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
};

export const downloadEpub = async (project: Project, chapters: Chapter[]) => {
    const zip = new JSZip();
    const sortedChapters = [...chapters].sort((a, b) => a.index - b.index);
    const uuid = `urn:uuid:${project.id}`;
    
    // 1. Mimetype
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // 2. Container
    zip.file("META-INF/container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
   <rootfiles>
      <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
   </rootfiles>
</container>`);

    // 3. Chapters HTML
    const oebps = zip.folder("OEBPS");
    if (!oebps) return;

    // CSS
    oebps.file("style.css", `
        body { font-family: "Times New Roman", serif; line-height: 1.5; margin: 0; padding: 1em; }
        h1, h2 { text-align: center; color: #333; }
        p { text-indent: 1.5em; margin-bottom: 0.5em; text-align: justify; }
        .cover { width: 100%; height: auto; }
    `);

    // Title Page
    oebps.file("title.xhtml", `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${project.title}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div style="text-align: center; margin-top: 20%;">
    <h1>${project.title}</h1>
    <h2>${project.author}</h2>
    <p>${project.description?.replace(/\n/g, '<br/>')}</p>
  </div>
</body>
</html>`);

    // Chapters
    sortedChapters.forEach(chapter => {
        const title = chapter.titleTranslated || chapter.titleOriginal;
        const body = (chapter.contentTranslated || chapter.contentRaw || "").split('\n').map(p => `<p>${p}</p>`).join('');
        
        oebps.file(`chapter_${chapter.index}.xhtml`, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <h2>Chương ${chapter.index}: ${title}</h2>
  ${body}
</body>
</html>`);
    });

    // 4. Content.opf (Manifest & Spine)
    let manifest = `
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`;
    
    let spine = `<itemref idref="title"/>`;
    
    sortedChapters.forEach(c => {
        manifest += `<item id="ch${c.index}" href="chapter_${c.index}.xhtml" media-type="application/xhtml+xml"/>`;
        spine += `<itemref idref="ch${c.index}"/>`;
    });

    const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${project.title}</dc:title>
    <dc:creator opf:role="aut">${project.author}</dc:creator>
    <dc:language>${project.targetLang === 'Vietnamese' ? 'vi' : 'en'}</dc:language>
    <dc:identifier id="BookId" opf:scheme="UUID">${uuid}</dc:identifier>
    <meta name="cover" content="cover-image" />
  </metadata>
  <manifest>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;

    oebps.file("content.opf", opf);

    // 5. NCX (Table of Contents)
    let navMap = `
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>`;
    
    sortedChapters.forEach((c, i) => {
        navMap += `
    <navPoint id="navPoint-${i + 2}" playOrder="${i + 2}">
      <navLabel><text>Chương ${c.index}: ${c.titleTranslated || c.titleOriginal}</text></navLabel>
      <content src="chapter_${c.index}.xhtml"/>
    </navPoint>`;
    });

    const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${project.title}</text></docTitle>
  <navMap>
    ${navMap}
  </navMap>
</ncx>`;

    oebps.file("toc.ncx", ncx);

    // Generate Blob
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(project.title)}.epub`;
    a.click();
    URL.revokeObjectURL(url);
};
