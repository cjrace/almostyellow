import styles from '../../app/page.module.css';
import Link from 'next/link';
import Image from 'next/image';

const irishbingoPage = () => {
    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <h1>Irish bingo</h1>
                <p>Under construction...</p>
                <Image
                    aria-hidden
                    src="/images/tayto.svg"
                    alt="Mr. Tayto"
                    height={300}
                    width={300}
                    style={{ display: 'block', margin: '0 auto' }}
                />
                <div className={styles.ctas}>
                    <Link href="/games" className={styles.secondary}>
                        Back to games
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default irishbingoPage;
