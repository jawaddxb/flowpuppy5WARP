"use client"
import React from 'react'

type Dict = Record<string,string>
const I18nCtx = React.createContext<{ t: (k:string)=>string }>({ t: (k)=> k })

export function I18nProvider({ children, dict }: { children: React.ReactNode; dict?: Dict }) {
  const map = dict || (()=>{ try { return require('../i18n/en.json') as Dict } catch { return {} } })()
  const t = React.useCallback((k: string)=> map[k] || k, [map])
  return <I18nCtx.Provider value={{ t }}>{children}</I18nCtx.Provider>
}

export function useT() { return React.useContext(I18nCtx).t }


