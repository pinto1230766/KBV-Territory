// Implémentation du chiffrement / déchiffrement compatible .thshare
// Basé sur TerritoryHelper.Mobile.IO.ProgressShare.ProgressShareFile.cs (AES-CBC + PBKDF2)

export class CryptoService {
  // Dérivation de clé avec PBKDF2 (10000 itérations, SHA-256)
  private static async deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: 10000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Chiffrement d'une chaîne JSON avec mot de passe
  static async encryptThShare(payloadJson: string, secret: string): Promise<Blob> {
    const enc = new TextEncoder();
    const data = enc.encode(payloadJson);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(secret, salt);

    const encryptedContent = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv: iv as BufferSource },
      key,
      data
    );

    // Format binaire : [4 bytes MAGIC "THSH"] + [16 bytes SALT] + [16 bytes IV] + [ENCRYPTED DATA]
    const magic = new Uint8Array([0x54, 0x48, 0x53, 0x48]); // 'THSH'
    return new Blob([magic, salt, iv, encryptedContent], { type: 'application/territoryhelper-share' });
  }

  // Déchiffrement d'un fichier .thshare avec mot de passe
  static async decryptThShare(fileData: ArrayBuffer, secret: string): Promise<string> {
    const magic = new Uint8Array(fileData.slice(0, 4));
    const isThShare = magic[0] === 0x54 && magic[1] === 0x48 && magic[2] === 0x53 && magic[3] === 0x48;

    if (!isThShare) {
      throw new Error("Ce fichier n'est pas un fichier .thshare valide de Territory Helper.");
    }

    const salt = new Uint8Array(fileData.slice(4, 20));
    const iv = new Uint8Array(fileData.slice(20, 36));
    const ciphertext = fileData.slice(36);

    const key = await this.deriveKey(secret, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: iv as BufferSource },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }
}
