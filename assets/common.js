/* Shared helpers for the ported tools (no framework). */
(function(){
  const K = window.KW = window.KW || {};
  K.esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  /* Wire a .drop element: click opens the file input inside it, drag & drop works too. onFiles(FileList|File[]) */
  K.dropzone = function(el, onFiles){
    const inp = el.querySelector("input[type=file]");
    el.addEventListener("click", e => { if (e.target !== inp) inp.click(); });
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); } });
    inp.addEventListener("change", () => { if (inp.files.length) onFiles([...inp.files]); inp.value = ""; });
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("over"); });
    el.addEventListener("dragleave", () => el.classList.remove("over"));
    el.addEventListener("drop", async e => {
      e.preventDefault(); el.classList.remove("over");
      const items = [...(e.dataTransfer.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
      if (items.some(it => it.isDirectory)) onFiles(await K.readEntries(items));
      else onFiles([...e.dataTransfer.files]);
    });
  };
  /* Walk dropped folders; each File gets .relPath */
  K.readEntries = async function(entries){
    const out = [];
    async function walk(ent, prefix){
      if (ent.isFile) {
        const f = await new Promise((res, rej) => ent.file(res, rej));
        f.relPath = prefix + f.name; out.push(f);
      } else if (ent.isDirectory) {
        const rd = ent.createReader();
        let batch;
        do { batch = await new Promise((res, rej) => rd.readEntries(res, rej));
             for (const b of batch) await walk(b, prefix + ent.name + "/"); } while (batch.length);
      }
    }
    for (const e of entries) await walk(e, "");
    return out;
  };
  K.copy = async function(text, btn){
    try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = "복사됨"; setTimeout(() => btn.textContent = o, 1200); } return true; }
    catch (e) { return false; }
  };
  K.md5 = null; /* set by md5.js where needed */
})();
