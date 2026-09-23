import React from 'react';

const CONTACT = 'motoneo333@gmail.com';
const UPDATED = '23 de septiembre de 2026';

const Page: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="min-h-screen bg-[#090A0F] text-[#F3F4F6] p-5 max-w-md mx-auto space-y-5 pb-16 text-sm leading-relaxed">
    <a href="/" className="text-xs font-bold text-[#FF5A1F]">← PACTO</a>
    <h1 className="text-2xl font-black">{title}</h1>
    <p className="text-xs text-gray-400">Última actualización: {UPDATED}</p>
    {children}
  </main>
);

const H = ({ children }: { children: React.ReactNode }) => <h2 className="text-base font-extrabold text-white pt-2">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-gray-300">{children}</p>;

export const PrivacyView: React.FC = () => (
  <Page title="Política de privacidad">
    <P>PACTO es una aplicación para que grupos de amigos se propongan metas, se verifiquen entre sí y asuman consecuencias acordadas. Esta política explica qué datos usamos y para qué.</P>

    <H>Qué datos recogemos</H>
    <ul className="list-disc pl-5 space-y-1 text-gray-300">
      <li><strong>Cuenta:</strong> tu correo electrónico y el nombre de usuario que eliges. Si entras con Google, recibimos tu correo y, si existe, tu foto de perfil.</li>
      <li><strong>Evidencias:</strong> las fotos que subes para demostrar que cumpliste, y la ubicación GPS aproximada del momento de la foto si das permiso.</li>
      <li><strong>Actividad:</strong> tus grupos, pactos, firmas, votos, sentencias y puntos de honor.</li>
      <li><strong>Notificaciones:</strong> si las activas, un identificador técnico de tu dispositivo para enviarte avisos.</li>
    </ul>

    <H>Para qué los usamos</H>
    <P>Solo para hacer funcionar la aplicación: iniciar tu sesión, verificar evidencias, calcular resultados y enviarte los recordatorios que actives. No vendemos tus datos, no mostramos publicidad y no los usamos para perfilarte.</P>

    <H>Quién puede ver tus datos</H>
    <P>Tus fotos, ubicación y votos solo son visibles para los miembros de los pactos en los que participas. Las fotos se guardan en un almacenamiento privado y se muestran mediante enlaces temporales.</P>

    <H>Proveedores que procesan datos por nosotros</H>
    <ul className="list-disc pl-5 space-y-1 text-gray-300">
      <li><strong>Supabase</strong> (base de datos, autenticación y almacenamiento de archivos).</li>
      <li><strong>Vercel</strong> (alojamiento de la aplicación).</li>
      <li><strong>Google</strong> (solo si eliges «Continuar con Google»).</li>
    </ul>
    <P>Estos proveedores pueden almacenar datos fuera de tu país, por ejemplo en Estados Unidos.</P>

    <H>Conservación y borrado</H>
    <P>Conservamos tus datos mientras tengas cuenta. Puedes borrar tu cuenta cuando quieras desde <em>Perfil → Privacidad y datos → Borrar mi cuenta y mis fotos</em>. Se eliminan tu cuenta, tus fotos, tus votos y tus sentencias.</P>

    <H>Tus derechos</H>
    <P>Puedes pedirnos acceso, corrección o eliminación de tus datos escribiendo a <a className="text-[#FF5A1F]" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</P>

    <H>Menores</H>
    <P>PACTO no está dirigida a menores de 16 años. Si crees que un menor se registró, escríbenos y borraremos la cuenta.</P>

    <H>Cambios</H>
    <P>Si cambiamos esta política, actualizaremos la fecha de arriba.</P>
  </Page>
);

export const TermsView: React.FC = () => (
  <Page title="Condiciones del servicio">
    <P>Al usar PACTO aceptas estas condiciones.</P>

    <H>El servicio</H>
    <P>PACTO permite crear grupos, acordar metas («pactos») entre sus miembros, subir evidencias, votarlas y asignar una consecuencia acordada a quien no cumple. Es un juego entre amigos.</P>

    <H>Tu cuenta</H>
    <P>Debes tener al menos 16 años. Eres responsable de tu cuenta y de lo que se haga con ella.</P>

    <H>Reglas de uso</H>
    <ul className="list-disc pl-5 space-y-1 text-gray-300">
      <li>Sube solo fotos propias y reales de tu cumplimiento; no subas contenido ilegal, íntimo, ofensivo o de terceros sin su permiso.</li>
      <li>Las consecuencias deben ser legales, seguras y aprobadas por todos los miembros. No propongas castigos que pongan en riesgo la salud, la seguridad o la dignidad de nadie.</li>
      <li>No intentes falsear evidencias, votos ni resultados, ni acceder a datos de otros usuarios.</li>
    </ul>

    <H>Consecuencias entre usuarios</H>
    <P>PACTO no exige, cobra ni gestiona dinero. El cumplimiento de cualquier consecuencia es un acuerdo entre los miembros del grupo, y cada uno es responsable de lo que propone y acepta. No somos parte de esos acuerdos.</P>

    <H>Contenido</H>
    <P>Conservas los derechos sobre tus fotos. Nos das permiso para almacenarlas y mostrarlas a los miembros de tus pactos con el único fin de que el servicio funcione.</P>

    <H>Sin garantías</H>
    <P>El servicio se ofrece «tal cual», sin garantía de disponibilidad continua. En la medida que permita la ley, no somos responsables de daños derivados del uso de la aplicación ni de las consecuencias acordadas entre usuarios.</P>

    <H>Suspensión</H>
    <P>Podemos suspender cuentas que incumplan estas condiciones. Tú puedes borrar tu cuenta cuando quieras desde tu perfil.</P>

    <H>Contacto</H>
    <P><a className="text-[#FF5A1F]" href={`mailto:${CONTACT}`}>{CONTACT}</a></P>
  </Page>
);
