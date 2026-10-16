import manifest from '../../emoji-src/manifest.json'
import { Page } from '../components/Page'
import { Lottie } from '../components/Lottie'

/** Служебная страница /emoji — все эмодзи из паков в виде Lottie */
export function EmojiGalleryPage() {
  return (
    <Page back>
      {Object.entries(manifest).map(([pack, items]) => (
        <section key={pack} className="section">
          <h3 className="section-title">
            {pack} · {items.length}
          </h3>
          <div className="emoji-grid">
            {items.map((e) => (
              <div key={e.file} className="emoji-grid-item" title={e.file}>
                <Lottie name={e.file.replace('.json', '')} size={56} />
                <span>{e.emoji}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </Page>
  )
}
