import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {parseHTML} from 'linkedom';
import useSession from '../src/useSession.jsx';
import Desk from '../src/Desk.jsx';
import TicketWorkspace from '../src/TicketWorkspace.jsx';
export async function verify(){
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 globalThis.window=window;globalThis.document=document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const values=new Map();
 window.sessionStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let offline=false,calls=0;
 window.fetch=async()=>{calls++;if(offline)throw new Error('offline');return {ok:true,status:200,json:async()=>({nombre:'Usuario validado',roles:['agente']})};};
 let api;
 function SessionView(){api=useSession();return <p>{api.restoring?'restaurando':api.session?.user.nombre||'sin sesión'}</p>;}
 let root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(<SessionView/>));
 assert.equal(document.querySelector('p').textContent,'sin sesión');
 await act(async()=>api.loginSession({access_token:'demo',expires_in:900,user:{nombre:'Agente'}}));
 assert.equal(document.querySelector('p').textContent,'Agente');
 await act(async()=>root.unmount());
 root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(<SessionView/>));
 assert.equal(document.querySelector('p').textContent,'Usuario validado');assert.equal(calls,1);
 await act(async()=>root.unmount());
 offline=true;root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(<SessionView/>));
 assert.ok(api.restoreError);assert.equal(values.size,1);
 offline=false;await act(async()=>api.retry());
 assert.equal(api.session.user.nombre,'Usuario validado');
 await act(async()=>api.invalidate('demo'));
 assert.equal(values.size,0);assert.equal(document.querySelector('p').textContent,'sin sesión');
 await act(async()=>root.unmount());
 root=createRoot(document.getElementById('root'));
 const sections=[{id:'atencion',label:'Atención',content:<button>Tomar ticket</button>},{id:'proceso',label:'Datos del proceso',content:<input defaultValue="Borrador"/>},{id:'historial',label:'Historial',content:<p>Bitácora</p>}];
 await act(async()=>root.render(<TicketWorkspace ticketId="41" initial="atencion" sections={sections}/>));
 const buttons=()=>Array.from(document.querySelectorAll('nav button'));
 assert.equal(buttons()[0].getAttribute('aria-pressed'),'true');
 assert.equal(document.getElementById('ticket-section-proceso').hidden,true);
 await act(async()=>buttons()[1].click());
 const input=document.querySelector('input');input.value='Cambio pendiente';
 assert.equal(document.getElementById('ticket-section-proceso').hidden,false);
 await act(async()=>buttons()[2].click());
 await act(async()=>buttons()[1].click());
 assert.equal(document.querySelector('input').value,'Cambio pendiente');
 // Refrescar el mismo ticket conserva la sección; abrir otro vuelve a Atención.
 await act(async()=>root.render(<TicketWorkspace ticketId="41" initial="atencion" sections={sections}/>));
 assert.equal(buttons()[1].getAttribute('aria-pressed'),'true');
 await act(async()=>root.render(<TicketWorkspace ticketId="42" initial="atencion" sections={sections}/>));
 assert.equal(buttons()[0].getAttribute('aria-pressed'),'true');
 await act(async()=>root.unmount());
 // Ficha real: agente toma y ve el responsable; solicitante no recibe secciones operativas.
 window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
 window.HTMLElement.prototype.close=function(){this.removeAttribute('open');};
 const ticket={id:'41',titulo:'Prueba',descripcion:'Incidente',estado:'registrado',proceso:'incidentes',cola_id:'1',responsable_id:null,servicio:{codigo:'SE.01',nombre:'Servicio',nivel1:'Infraestructura'},ci:[],sin_ci_motivo:'Sin equipo',comentarios:[],adjuntos:[],relaciones:[],notificaciones:[],bitacora:[],transiciones:['registrado','clasificacion'],detalle:{categoria:'I2',redundancia:false,afectacion:'degradacion'}};
 const boot={usuarios:[{id:'3',nombre:'Agente de prueba'}],colas:[{id:'1',nombre:'Nivel 1',proceso:'incidentes',activo:true}],servicios:[],clases:[],ubicaciones:[],incidentes:[{categoria:'I2'}]};
 const request=async(path,options)=>{
  if(path==='/desk/bootstrap')return boot;
  if(path.startsWith('/desk/ci-opciones'))return {items:[]};
  if(path.startsWith('/desk/tickets?'))return {items:[ticket],total:1};
  if(path==='/desk/tickets/41/accion'){
   assert.equal(JSON.parse(options.body).accion,'tomar');ticket.responsable_id='3';return {...ticket};
  }
  if(path==='/desk/tickets/41')return {...ticket};
  throw new Error('Ruta inesperada '+path);
 };
 for(const role of ['agente','solicitante']){
  root=createRoot(document.getElementById('root'));
  await act(async()=>root.render(<Desk request={request} session={{access_token:'demo',user:{id:'3',rol:'consulta',roles:[role]}}}/>));
  await act(async()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Abrir').click());
  const sectionButtons=Array.from(document.querySelectorAll('.ticket-sections button'));
  assert.equal(sectionButtons.length,role==='agente'?6:3);
  if(role==='agente'){
   assert.equal(sectionButtons[1].getAttribute('aria-pressed'),'true');
   await act(async()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Tomar ticket').click());
   assert.ok(document.querySelector('.ticket-overview').textContent.includes('Agente de prueba'));
   assert.equal(Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Ticket asignado').disabled,true);
  }else{
   assert.ok(!document.querySelector('#ticket-section-atencion'));
   assert.ok(!document.querySelector('#ticket-section-proceso'));
   assert.ok(!document.querySelector('#ticket-section-relaciones'));
  }
  await act(async()=>root.unmount());
 }
 delete globalThis.window;delete globalThis.document;delete globalThis.IS_REACT_ACT_ENVIRONMENT;
}
