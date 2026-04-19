'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient, getCurrentUserProfile } from './supabase'

const TenantContext = createContext()

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadTenant() {
      const { user, profile } = await getCurrentUserProfile(supabase)
      
      if (profile?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', profile.tenant_id)
          .single()
        
        if (tenantData) {
          setTenant(tenantData)
        }
      }
      setLoading(false)
    }

    loadTenant()
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, setTenant, loading }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
