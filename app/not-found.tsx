import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.brand} aria-label="follow トップページへ">
        follow
        <span>Pilates Yoga Studio</span>
      </Link>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <p className={styles.english} lang="en">Page not found</p>
        <h1>ページが見つかりませんでした</h1>
        <p className={styles.description}>
          お探しのページは移動または削除されたか、<br className={styles.desktopBreak} />
          URLが間違っている可能性があります。
        </p>
        <Link href="/" className={styles.back}>トップページへ戻る<span aria-hidden="true"> →</span></Link>
      </div>
      <p className={styles.footer}>follow Pilates Yoga Studio</p>
    </main>
  );
}
