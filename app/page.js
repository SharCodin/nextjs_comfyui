import Image from "next/image";
import styles from "./page.module.css";

import ComfyUI from './components/ComfyUI';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Connecting to ComfyUI</h1>
        <ComfyUI />
      </main>
      <footer className={styles.footer}>
        <p>This is a test application.</p>
      </footer>
    </div>
  );
}