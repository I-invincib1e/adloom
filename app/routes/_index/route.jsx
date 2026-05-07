import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { login } from "../../shopify.server";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  return (
    <div className={styles.page}>
      {/* Nav */}
      <header className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>Loom</span>
          <span className={styles.logoSub}> · Offer & Sales</span>
        </div>
        <a
          href="https://apps.shopify.com"
          className={styles.navCta}
          target="_blank"
          rel="noreferrer"
        >
          Install on Shopify
        </a>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>🚀 Built for Shopify Merchants</div>
        <h1 className={styles.heroHeading}>
          Run flash sales, timers &amp; offers —<br />
          <span className={styles.heroAccent}>without the complexity.</span>
        </h1>
        <p className={styles.heroSub}>
          Loom lets you schedule price discounts, add urgency with countdown
          timers, and show personalised coupon banners — all from one simple
          dashboard.
        </p>

        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <div className={styles.formInner}>
              <input
                className={styles.input}
                type="text"
                name="shop"
                placeholder="your-store.myshopify.com"
                autoComplete="off"
              />
              <button className={styles.button} type="submit">
                Get Started →
              </button>
            </div>
            <p className={styles.formHint}>
              Enter your Shopify store domain to install the app.
            </p>
          </Form>
        )}
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🏷️</div>
          <h3 className={styles.featureTitle}>Flash Sales</h3>
          <p className={styles.featureText}>
            Schedule automatic price discounts across any products or
            collections. Sales revert on their own — no manual work needed.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>⏱️</div>
          <h3 className={styles.featureTitle}>Countdown Timers</h3>
          <p className={styles.featureText}>
            Add urgency to product pages with beautiful, customisable countdown
            timers that match your store's brand.
          </p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>🎁</div>
          <h3 className={styles.featureTitle}>Coupon Offers</h3>
          <p className={styles.featureText}>
            Display targeted coupon banners to the right customers at the right
            time — by product, collection, tag, or vendor.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          © {new Date().getFullYear()} Loom · Offer &amp; Sales &nbsp;|&nbsp;
          <a className={styles.footerLink} href="/privacypage">
            Privacy Policy
          </a>
          &nbsp;|&nbsp;
          <a
            className={styles.footerLink}
            href="mailto:Hello@adloomx.com"
          >
            Hello@adloomx.com
          </a>
        </p>
      </footer>
    </div>
  );
}
