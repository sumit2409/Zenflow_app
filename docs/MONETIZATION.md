# Zenflow monetization setup

## Live check: November 11, 2026

- `https://zenflow.bio/ads.txt` returned `google.com, pub-8360208538374772, DIRECT, f08c47fec0942fa0`.
- The public homepage loaded the AdSense script and Google's ad runtime, created an advertisement iframe, and sent a Google ad request.
- This confirms integration activity, not filled inventory, account approval, impressions, or earnings. A hidden iframe alone does not prove a visible paid ad.
- No `window.__tcfapi` was detected in the observed browser session. Region and account configuration can affect which message appears; check Privacy & messaging rather than treating this observation as a complete compliance audit.
- Account approval, policy warnings, payment setup, and revenue reports are not accessible from this repository.

## Finish AdSense setup in your account

### Account inspection and action: November 11, 2026

The owner signed in and authorized setup. Site ownership was already verified, but the site showed **Requires review**. Submitted **Request review**. The onboarding page then confirmed **Getting your site ready to show ads**, **you've completed all the steps**, and **Thanks for connecting the site**. Approval is still pending; this is not a revenue confirmation.

Also confirmed:

- Payments onboarding: **We've got your info**. This does not establish that every future payout/identity/tax requirement is complete.
- Ad settings preview: **Auto ads** already enabled. No format settings were changed.
- European regulations message for **zenflow.bio**: **Published**, English plus 31 other languages, last modified March 1, 2026. It showed zero messages in the displayed report. The earlier public-browser observation does not mean no CMP is configured; live delivery still needs checking after approval.
- Policy center: **No current issues**.
- After refreshing onboarding, the account-activation warning disappeared. The remaining banner was a general warning about monetization of content concerning the war in Ukraine.

Next: wait for Google's review decision and inspect **Sites** for **Ready** or any requested fixes. No additional site-review request is needed while the submitted request is pending.

1. Open **Sites → zenflow.bio**. Confirm status is **Ready**, that this publisher ID is yours, and that ads.txt is authorized. Resolve any review or policy warnings shown there.
2. Open **Ads → By site → zenflow.bio → Edit**. Enable **Auto ads**, preview placements, and apply to the site. The current integration uses Auto ads; it has no manually configured ad unit slots.
3. Open **Privacy & messaging** and configure/publish Google's European regulations message or install a Google-certified TCF CMP. Follow the exact account-provided setup instructions. The custom Zenflow analytics cookie banner is not a replacement for advertising consent. Do not use its analytics checkbox as advertising consent.
4. Review regional privacy settings and update the public Privacy and Cookie pages to reflect the actual ad partners and consent controls you enable. Provide the CMP's privacy-options control as instructed by that provider. This remains an account-dependent launch step.
5. Configure page/area exclusions for authentication, account pages, private tools, legal pages, timers, and interactive controls. The app is a single-page application: once Google's runtime loads, removing a script tag does not disable it. Use AdSense exclusions and verify navigation in the preview and browser. Do not assume the React loader condition guarantees ad-free screens.
6. Complete any identity, address, tax, or payment steps requested in **Payments**. Inspect **Reports** for impressions, coverage, clicks, and estimated earnings over real visitor traffic. Never click your own ads or ask visitors to click them.

Official references:

- [Add and review a site](https://support.google.com/adsense/answer/12169212?hl=en)
- [Configure Auto ads](https://support.google.com/adsense/answer/9261307?hl=en-GB)
- [Certified CMP requirements](https://support.google.com/adsense/answer/13554116?hl=en)

## Repository changes

- Publisher verification metadata in [the HTML entry point](../client/index.html).
- [Ad loader](../client/src/App.tsx) loads once per document, skips development and native builds, and logs script-load failures. It does not grant consent or verify account approval.
- Set `VITE_ADSENSE_ENABLED=false` and rebuild/redeploy to stop loading the script on fresh page loads. Existing tabs need a reload.
- [Revenue links](../client/src/components/RevenueLinks.tsx) supports optional external support and affiliate URLs in the website footer. Links are hidden when unconfigured and omitted from native builds. Affiliate links carry a visible commission disclosure and `rel="sponsored"`.

## Activate additional revenue links

Set these public build-time values in your hosting build environment (see [the example configuration](../client/.env.example)):

```dotenv
VITE_SUPPORT_URL=
VITE_AFFILIATE_URL=
VITE_AFFILIATE_LABEL=
```

- Support: create your own support/payment page and paste its HTTPS URL into `VITE_SUPPORT_URL`.
- Affiliates: join a relevant program, obtain your approved tracking URL, and set `VITE_AFFILIATE_URL` plus an accurate `VITE_AFFILIATE_LABEL`. No partner enrollment or commission arrangement is created by this code.
- Leave unused fields empty. Only valid HTTPS links appear. Never put API secrets in `VITE_` values: they are public in the frontend bundle.
- Rebuild with `npm run build`, deploy the resulting application, and verify the destinations and disclosure. These changes have not been deployed by this task.

## Other income paths

- Direct sponsorship: sell a clearly disclosed placement on public articles once you can substantiate audience and traffic. Requires an advertiser agreement and real campaign details before adding a placement.
- Digital products: sell a useful planning template or focus workbook through an owned checkout page. A real product, price, fulfillment, and payment account are needed first.
- Premium features: requires a product/pricing decision, server-side payment verification, subscription webhooks, and entitlement checks. A payment button alone is insufficient; none are implemented here.
- Android ads: use a separate AdMob integration with your own app/ad-unit IDs and platform consent flow. Website AdSense is excluded from native builds in this change; no AdMob revenue is configured.

Begin with verified AdSense delivery plus one support or affiliate destination. Assess actual traffic and conversion before adding more ad networks. None of these paths guarantees revenue.
