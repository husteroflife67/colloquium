/** Small technical diagrams drawn locally; decorative, with no fabricated metrics. */
export function LearningArt({ variant = "hero" }: { variant?: "hero" | "discrete" | "calculus" | "linear" }) {
  const hero = variant === 'hero';
  return <svg className={`learning-art ${hero ? 'learning-art-hero' : ''}`} viewBox={hero ? '0 0 480 300' : '0 0 480 180'} fill="none" aria-hidden="true">
    <g stroke="currentColor" opacity=".13" strokeWidth="1">
      {[60,120,180,240,300,360,420].map(x=><path key={x} d={`M${x} 0V${hero?300:180}`} />)}
      {[30,90,150,...(hero?[210,270]:[])].map(y=><path key={y} d={`M0 ${y}H480`} />)}
    </g>
    {variant === 'discrete' ? <g stroke="currentColor" strokeWidth="1.5"><path d="M100 126 180 48 280 128 380 50M100 126H280L180 48H380L280 128" />{[[100,126],[180,48],[280,128],[380,50]].map(([x,y],i)=><rect key={x} x={x-7} y={y-7} width="14" height="14" fill={i===1?'var(--ds-mark)':'var(--ds-surface)'} />)}</g> : variant === 'linear' ? <g stroke="currentColor" strokeWidth="1.5"><path d="M135 35h-15v110h15m210-110h15v110h-15" />{[170,240,310].flatMap((x,i)=>[56,90,124].map((y,j)=><rect key={`${x}-${y}`} x={x-5} y={y-5} width="10" height="10" fill={i===j?'currentColor':'none'}/>))}<path d="M58 90h30m304 0h30" /></g> : <g className={hero?'art-float':undefined} stroke="currentColor" strokeWidth="1.5">
      <path d={hero?'M60 248H432M90 270V28':'M60 142H432M90 162V22'} />
      <path d={hero?'M90 230C170 230 160 80 270 80H420':'M90 134C170 134 160 48 270 48H420'} strokeWidth="2.5" />
      <path d={hero?'M90 80H420M270 80V248':'M90 48H420M270 48V142'} strokeDasharray="4 5" opacity=".45" />
      <rect x="264" y={hero?74:42} width="12" height="12" fill="var(--ds-mark)" />
      {hero && <><path d="M330 166h90v82h-90zM360 166v82m30-82v82m-60-55h90m-90 28h90" opacity=".45" /><path d="M60 20h14m-7-7v14M433 270h14m-7-7v14" /></>}
    </g>}
  </svg>;
}
