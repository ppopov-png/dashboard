import reference from '../assets/trigonum-brand-reference.png'

// Display the supplied brand pixels directly, without substituting a font or
// regenerating the symbol. The SVG viewport selects the wordmark in the source.
export function BrandWordmark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="78 104 329 48" role="img" aria-label="TRIGONUM">
    <image href={reference} width="1672" height="941" />
  </svg>
}

export function BrandEmblem({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="775 200 755 480" aria-hidden="true">
    <defs>
      <mask id="trigonum-reference-emblem" maskUnits="userSpaceOnUse" x="775" y="200" width="755" height="480">
        <path fill="white" d="M1017 246 1226 213 Q1304 198 1346 255 Q1362 279 1362 326 L1358 565 Q1358 628 1308 652 L983 657 Q926 651 925 592 L926 331 Q925 267 1017 246Z" />
        <ellipse cx="1151" cy="450" rx="377" ry="87" transform="rotate(-18 1151 450)" fill="none" stroke="white" strokeWidth="21" />
      </mask>
    </defs>
    <image href={reference} width="1672" height="941" mask="url(#trigonum-reference-emblem)" />
  </svg>
}
