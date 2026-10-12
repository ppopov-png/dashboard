import reference from '../assets/trigonum-brand-reference.png'
import orbitConcept from '../assets/trigonum-orbit-concept.png'

// Display the supplied brand pixels directly, without substituting a font or
// regenerating the symbol. The SVG viewport selects the wordmark in the source.
export function BrandWordmark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="78 104 329 48" role="img" aria-label="TRIGONUM">
    <image href={reference} width="1672" height="941" />
  </svg>
}

export function BrandEmblem({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="300 530 500 345" aria-hidden="true">
    <defs>
      <mask id="trigonum-orbit-emblem" maskUnits="userSpaceOnUse" x="300" y="530" width="500" height="345">
        <path fill="white" d="M458 578 622 551 Q671 540 688 582 Q700 603 699 636 L696 777 Q696 826 659 844 L457 859 Q405 858 398 813 L398 640 Q395 596 458 578Z" />
        <ellipse cx="550" cy="708" rx="246" ry="65" transform="rotate(-19 550 708)" fill="none" stroke="white" strokeWidth="20" />
      </mask>
    </defs>
    <image href={orbitConcept} width="1672" height="941" mask="url(#trigonum-orbit-emblem)" />
  </svg>
}
