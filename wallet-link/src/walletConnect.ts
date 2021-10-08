import WalletConnect from '@walletconnect/client'
import QRCodeModal from "@walletconnect/qrcode-modal"


async function connect() {
  const bridge = "https://bridge.walletconnect.org"

  const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal })

  if (connector.connected) {
    await connector.createSession()
  }
}

