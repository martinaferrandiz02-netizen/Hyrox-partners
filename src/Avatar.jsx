// Avatar: foto de perfil si la hay; si no, las iniciales sobre un color
export function Avatar({ p, style, onClick }) {
  return (
    <div className={`avatar ${p.fotoUrl ? 'con-foto' : p.color}`} style={style} onClick={onClick}>
      {p.fotoUrl ? <img src={p.fotoUrl} alt="" loading="lazy" /> : p.iniciales}
    </div>
  )
}
