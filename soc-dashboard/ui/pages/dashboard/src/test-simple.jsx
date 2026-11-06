import React from 'react'

export function TestSimple() {
  console.log('[FOUNDRY-TEST] TestSimple rendering');

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ff0000',
      color: '#ffffff',
      fontSize: '48px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        padding: '50px',
        background: '#000000',
        border: '10px solid #ffff00',
        textAlign: 'center'
      }}>
        <div>✅ FOUNDRY TEST SUCCESS ✅</div>
        <div style={{ fontSize: '24px', marginTop: '20px' }}>
          App initialized correctly!
        </div>
      </div>
    </div>
  )
}
