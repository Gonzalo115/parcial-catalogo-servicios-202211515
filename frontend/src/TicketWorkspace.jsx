import React,{useEffect,useState} from 'react';
/** Cambiar de sección conserva los campos pendientes de guardar. */
export default function TicketWorkspace({ticketId,initial='resumen',sections}){
 const [active,setActive]=useState(initial);
 useEffect(()=>{setActive(initial);},[ticketId,initial]);
 return <div className="ticket-workspace">
  <nav className="ticket-sections" aria-label="Secciones del ticket">
   {sections.map(section=><button type="button" key={section.id} aria-pressed={active===section.id}
    aria-controls={`ticket-section-${section.id}`} className={active===section.id?'selected':'secondary'}
    onClick={e=>{setActive(section.id);e.currentTarget.closest('.ticket-panel-body')?.scrollTo?.({top:0});}}>{section.label}</button>)}
  </nav>
  {sections.map(section=><div key={section.id} id={`ticket-section-${section.id}`} hidden={active!==section.id} className="ticket-section">
   <h3>{section.label}</h3>{section.content}
  </div>)}
 </div>;
}
