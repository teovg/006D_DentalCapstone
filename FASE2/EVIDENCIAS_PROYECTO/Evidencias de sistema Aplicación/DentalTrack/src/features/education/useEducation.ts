import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabaseClient } from '../../core/data/repository';
import { findExplanations } from './explanations';

export interface EducationAnswer {
  status: 'loading' | 'answered' | 'insufficient_evidence' | 'unavailable';
  explanation: string;
  sources: {id:string;url:string;domain:string}[];
  message?: string;
  generated: boolean;
}
export function useEducation(term:string, offline=false) {
  const entries=findExplanations(term);
  const [remote,setRemote]=useState<EducationAnswer>({status:'loading',explanation:'',sources:[],generated:true});
  useEffect(()=>{
    if(entries.length||!term.trim())return;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),50000);
    let active=true;
    const empty={explanation:'',sources:[],generated:true};
    void(async()=>{
      if(offline||!supabaseClient)throw new Error('La consulta con fuentes requiere conexión y una sesión iniciada.');
      const {data,error}=await supabaseClient.auth.getSession();
      if(error||!data.session)throw new Error('Inicia sesión para consultar este concepto.');
      const base=process.env.EXPO_PUBLIC_EDUCATION_ENDPOINT || (Platform.OS==='android'?'http://10.0.2.2:8130':'http://127.0.0.1:8130');
      const response=await fetch(`${base}/explain`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({term}),signal:controller.signal});
      const body=await response.json() as EducationAnswer;
      if(!response.ok)throw new Error(body.message||'La fuente no está disponible. Puedes reintentar.');
      if(!['answered','insufficient_evidence','unavailable'].includes(body.status)||!Array.isArray(body.sources)||body.sources.some(s=>!/^https:\/\//.test(s.url)))throw new Error('No se pudo verificar el formato de las fuentes.');
      if(active)setRemote(body);
    })().catch(error=>{if(active)setRemote({...empty,status:'unavailable',message:(error as Error).message});}).finally(()=>clearTimeout(timeout));
    return()=>{active=false;clearTimeout(timeout);controller.abort();};
  // Term changes remount the explanation sheet; only the public label is transmitted.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[term,offline]);
  return {entries,remote};
}
