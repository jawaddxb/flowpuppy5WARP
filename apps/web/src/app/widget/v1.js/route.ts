export const runtime = 'edge'

export async function GET() {
  const js = `
  (function(){
    class FPApp extends HTMLElement{
      connectedCallback(){
        const slug = this.getAttribute('slug')||'demo';
        const shadow = this.attachShadow({mode:'open'});
        shadow.innerHTML = '<style>:host{all:initial;display:block;font-family:ui-sans-serif,system-ui} .box{border:1px solid #e2e8f0;border-radius:8px;padding:12px;background:#fff}</style><div class="box"><div id="hdr"></div><div id="body"></div></div>';
        fetch('/apps/'+encodeURIComponent(slug)+'/manifest').then(r=>r.json()).then(m=>{
          shadow.getElementById('hdr').innerHTML = '<div style="font-weight:600">'+(m.icon||'🐶')+' '+m.name+'</div><div style="color:#64748b">'+(m.description||'')+'</div>';
          const b = shadow.getElementById('body');
          const form = document.createElement('form');
          (m.inputs||[]).forEach(inp=>{
            const label = document.createElement('label'); label.textContent = inp.label; label.style.display='block'; label.style.fontSize='12px'; label.style.margin='6px 0 2px';
            const input = document.createElement('input'); input.name = inp.name; input.value = inp.default||''; input.style.width='100%'; input.style.padding='6px'; input.style.border='1px solid #e2e8f0'; input.style.borderRadius='6px';
            form.appendChild(label); form.appendChild(input);
          });
          const btn = document.createElement('button'); btn.type='button'; btn.textContent='Run'; btn.style.marginTop='8px'; btn.style.padding='8px 12px'; btn.style.borderRadius='6px'; btn.style.background='#10b981'; btn.style.color='#fff';
          const out = document.createElement('div'); out.style.marginTop='8px'; out.style.fontSize='12px'; out.style.background='#f8fafc'; out.style.border='1px solid #e2e8f0'; out.style.padding='6px'; out.style.borderRadius='6px'; out.style.maxHeight='200px'; out.style.overflow='auto';
          btn.addEventListener('click', ()=>{
            out.textContent = 'Starting...\n';
            // mock preview
            const steps = ['Prepare inputs','Call API','Transform','Notify'];
            let i=0; const id = setInterval(()=>{ if(i<steps.length){ out.textContent += 'Step: '+steps[i++]+'\n'; } else { clearInterval(id); out.textContent += 'Done.\n'; } }, 600);
          });
          b.appendChild(form); b.appendChild(btn); b.appendChild(out);
        });
      }
    }
    customElements.define('flowpuppy-app', FPApp);
    window.FlowPuppy = { mount: function(){} };
  })();
  `
  return new Response(js, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=60' } })
}


