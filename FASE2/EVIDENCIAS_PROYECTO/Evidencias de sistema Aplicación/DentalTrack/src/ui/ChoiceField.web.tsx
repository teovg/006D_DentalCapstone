import { useRef, useState } from 'react';
import { ChoiceList, type ChoiceOption } from './ChoiceList';
import { colors, fontFamilies } from './theme';

interface Props<T extends string> {
  label: string; options: readonly ChoiceOption<T>[]; value: T;
  onChange: (value: T) => void; disabled?: boolean;
}

/** A disclosure, not a simulated native select or a custom combobox. */
export function ChoiceField<T extends string>({ label, options, value, onChange, disabled = false }: Props<T>) {
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const handledEscape = useRef(false);
  const selected = options.find((option) => option.id === value);
  const close = () => { setExpanded(false); trigger.current?.focus(); };
  return <div style={{display:'flex',flexDirection:'column',gap:8}} onKeyDown={(event) => {
    if (expanded && event.key === 'Escape') { handledEscape.current = true; event.preventDefault(); event.stopPropagation(); close(); }
  }} onKeyUp={(event) => {
    // RN Web's Modal dismisses on keyup; consume the same Escape used for this disclosure.
    if (event.key === 'Escape' && handledEscape.current) { handledEscape.current = false; event.stopPropagation(); }
  }}>
    <button ref={trigger} type="button" disabled={disabled} aria-expanded={expanded}
      aria-label={`${label}: ${selected?.label ?? value}`} onClick={() => setExpanded((current) => !current)}
      style={{display:'flex',alignItems:'center',gap:12,boxSizing:'border-box',width:'100%',minHeight:56,
        padding:'12px 14px',border:`1px solid ${colors.inputBorder}`,borderRadius:8,background:colors.surface,
        color:colors.ink,fontFamily:fontFamilies.body,fontSize:14,lineHeight:'21px',fontWeight:600,
        cursor:disabled?'default':'pointer',opacity:disabled?0.55:1,textAlign:'left'}}>
      {selected?.color ? <span aria-hidden style={{width:8,height:8,borderRadius:4,background:selected.color,flexShrink:0}} /> : null}
      <span style={{flex:1,minWidth:0,overflowWrap:'anywhere'}}>{selected?.label ?? value}</span>
      <span aria-hidden style={{color:colors.primary,fontSize:18,transform:expanded?'rotate(-90deg)':'rotate(90deg)'}}>›</span>
    </button>
    {expanded ? <ChoiceList label={label} options={options} value={value} disabled={disabled} onChange={(next) => { onChange(next); close(); }} /> : null}
  </div>;
}
