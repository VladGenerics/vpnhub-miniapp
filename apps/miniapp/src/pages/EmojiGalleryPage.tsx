import { Page } from '../components/Page'
import { Lottie } from '../components/Lottie'
import { ALL_EMOJI } from '../data/emoji'

/** Служебная страница /emoji: все эмодзи из паков одним списком */
export function EmojiGalleryPage() {
  return (
    <Page back>
      <section className="section">
        <h3 className="section-title">Все эмодзи · {ALL_EMOJI.length}</h3>
        <div className="emoji-grid">
          {ALL_EMOJI.map((name) => (
            <div key={name} className="emoji-grid-item" title={name}>
              <Lottie name={name} size={56} />
            </div>
          ))}
        </div>
      </section>
    </Page>
  )
}
