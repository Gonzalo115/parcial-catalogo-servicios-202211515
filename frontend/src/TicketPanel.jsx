import React,{useEffect,useRef} from 'react';
/** Panel lateral en la capa superior: foco contenido y Escape nativos del dialog. */
export default function TicketPanel({title,onClose,busy=false,error,children}){
 const ref=useRef(null);
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement,overflow=document.body.style.overflow;
  dialog.showModal();document.body.style.overflow='hidden';
  return()=>{dialog.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} className="ticket-panel" aria-labelledby="ticket-panel-title"
  onCancel={e=>{e.preventDefault();if(!busy)onClose();}}
  onClick={e=>{if(e.target===e.currentTarget&&!busy){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}>
  <header className="ticket-panel-header"><div><p className="eyebrow">SERVICE DESK</p><h2 id="ticket-panel-title">{title}</h2></div><button type="button" className="secondary" disabled={busy} aria-label="Cerrar panel de ticket" onClick={onClose}>Cerrar ×</button></header>
  <div className="ticket-panel-body">{error&&<p className="error" role="alert">{error}</p>}{busy&&<p role="status">Procesando…</p>}{children}</div>
 </dialog>;
}
