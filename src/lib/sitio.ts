import sitio from '@/data/sitio.json';

export { sitio };

export function whatsappUrl(): string {
  const { whatsapp, whatsappMensaje } = sitio.contacto;
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMensaje)}`;
}

export function instagramUrl(): string {
  return `https://www.instagram.com/${sitio.contacto.instagram.replace(/^@/, '')}/`;
}

export function mailtoUrl(): string {
  return `mailto:${sitio.contacto.mail}`;
}
