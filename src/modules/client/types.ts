

export interface ClientConfigs {
  namespace?: string,  
  // Persist wallet connections, even after refreshing
  // Only available in browsers
  persistConnection?: boolean,

  // Connect mnemonic on init
  // Only for server-side use
  mnemonic?: string,
}