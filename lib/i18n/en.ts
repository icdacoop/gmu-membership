import { MEMBER_FEES, ORG } from "../site";
import { money } from "./format";
import type { Dict } from "./ko";

// English copy. Must keep the same structure as ko.ts (enforced by the Dict type).
export const en: Dict = {
  meta: {
    title: "Global Media Union Membership",
    description:
      "Global Media Union (GMU) — a comprehensive media alliance platform that extends local perspectives to the world and connects people with the field. Membership guide and online application for individuals and companies.",
    privacyTitle: "Privacy Policy | Global Media Union",
    termsTitle: "Terms & Refund Policy | Global Media Union",
  },
  brand: {
    name: "Global Media Union",
    nameEn: "Global Media Union",
    ceo: "Park Yeon-jin",
    address: "3F, 526 Jungang-daero, Dong-gu, Busan, Republic of Korea",
    logoAlt: "Global Media Union logo",
  },
  period: "1 year",
  perPeriod: "/ year",
  nav: {
    about: "About",
    guide: "Membership",
    refund: "Refunds",
    faq: "FAQ",
    join: "Join",
    main: "Main menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    switchLabel: "한국어",
    switchAria: "한국어로 보기",
  },
  tagline:
    "A comprehensive media alliance platform that extends local perspectives to the world and connects people with the field",
  hero: {
    line1: "Local perspectives, to the world.",
    line2: "A media alliance connecting the field and its people.",
    join: "Join now",
    guide: "Membership guide",
    feeCaption: "Annual membership fee",
  },
  member: {
    individual: {
      label: "Individual member",
      description: "Joining in a personal capacity",
      fields: "Name, phone number, email, interests",
    },
    corporate: {
      label: "Corporate member",
      description: "Joining as a company or organization",
      fields: "Company name, representative name, phone number, email, interests",
    },
  },
  about: {
    eyebrow: "ABOUT",
    title: "About Global Media Union",
    visionTitle: "Core vision",
    activityTitle: "Main areas of activity",
    visions: [
      {
        title: "Field-centered",
        body: "Direct news with minimal intermediaries, delivering vivid and transparent voices from the field.",
      },
      {
        title: "Global insight",
        body: "In-depth analysis of domestic and international economic and current-affairs trends, providing reliable information.",
      },
      {
        title: "Win-win cooperation",
        body: "Building a global network that connects local communities with key industrial ecosystems.",
      },
    ],
    activities: [
      {
        title: "Media content",
        body: "We run internet news channels such as Global News Times and produce magazines and video content.",
      },
      {
        title: "Industry partnerships",
        body: "We partner with major institutions and industries (e.g., power semiconductors) to promote and spread technological and market competitiveness.",
      },
    ],
  },
  guide: {
    eyebrow: "MEMBERSHIP",
    title: "Membership guide",
    typesTitle: "Membership types and annual fees",
    inputItems: "Information to provide",
    stepsTitle: "How to join",
    steps: [
      { title: "Fill out the application", body: "Choose a membership type and enter your details." },
      { title: "Pay by card", body: "Pay the annual fee by card." },
      { title: "Membership confirmation", body: "We will send confirmation to the email and phone number you provided." },
    ],
  },
  refund: {
    eyebrow: "REFUND",
    title: "Refund policy",
    lead: "If you cancel **within 1 month** of payment, we refund **100%** of your fee.",
    rules: [
      {
        title: "Cancellation on the day of payment",
        body: "Processed immediately as a card payment cancellation. Your card will not be charged.",
      },
      {
        title: "From the day after payment up to 1 month",
        body: "We refund 100% of the fee. After we receive your request, the card payment is cancelled within 3–7 business days; it may take longer for the cancellation to appear depending on your card issuer. If the charge has already been billed, it will be deducted from your next statement or refunded.",
      },
      {
        title: "How to request a cancellation",
        body: `Email ${ORG.email} or call ${ORG.phone} (Korea) with your name, phone number, and application number.`,
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    items: [
      {
        q: "How much is the membership fee?",
        a: `Individual membership is ${money("en", MEMBER_FEES.individual)} per year, and corporate membership is ${money("en", MEMBER_FEES.corporate)} per year.`,
      },
      {
        q: "How do I pay?",
        a: "After submitting the application you can pay by card. Card details are entered directly on the payment provider's checkout page and are never stored on this site.",
      },
      {
        q: "Can I get a refund?",
        a: "Cancellations on the day of payment are processed immediately, and cancellations within 1 month are refunded 100%. See the refund policy for details.",
      },
      {
        q: "What is the difference between individual and corporate membership?",
        a: "The eligibility and annual fee differ, and corporate members additionally provide a company name and representative name.",
      },
      { q: "Whom do I contact with questions?", a: `Call ${ORG.phone} (Korea) or email ${ORG.email}.` },
    ],
  },
  consent: {
    itemsLabel: "Information collected",
    purposeLabel: "Purpose of use",
    retentionLabel: "Retention period",
    items:
      "Individual: name, phone number, email, interests / Corporate: company name, representative name, phone number, email, interests",
    purpose: "Confirming and guiding your membership, confirming fee payment, and responding to inquiries",
    retention:
      "Kept while your membership is active and destroyed without delay afterwards. Application data for which payment was not completed is destroyed 30 days after submission. However, under the Korean E-Commerce Act, contract, withdrawal and payment records are kept for 5 years, and consumer complaint and dispute records for 3 years.",
    refusal: "You may refuse to consent to the collection and use of personal information, but membership cannot be processed without it.",
  },
  apply: {
    eyebrow: "APPLY",
    title: "Apply for membership",
    intro: "Select a membership type and enter your details. The fields change depending on the membership type.",
    memberType: "Membership type",
    name: "Full name",
    companyName: "Company name",
    ceoName: "Representative name",
    phone: "Phone number",
    email: "Email",
    interest: "Interests",
    interestHint: "Tell us freely what you are interested in. (e.g., video production, economic news, regional industry promotion)",
    placeholderName: "Jane Doe",
    placeholderCompany: "Global Media Co., Ltd.",
    honeypot: "Website",
    consentLabel: "[Required] I agree to the collection and use of my personal information.",
    consentMore: "View collection and retention details",
    privacyLink: "Read the full Privacy Policy",
    feeCaption: "Amount due",
    submit: "Apply and proceed to payment",
    submitting: "Submitting…",
    doneTitle: "Your application has been received",
    orderId: "Application no.",
    memberRow: "Membership type",
    amountRow: "Amount",
    payButton: "Pay by card",
    payPending: "Card payment (coming soon)",
    payNote: `Online card payment will open soon. We will send payment instructions to the email and phone number you provided. Please keep your application number. Inquiries: ${ORG.phone} (Korea)`,
    errNetwork: "A network error occurred. Please check your connection and try again.",
    errGeneric: "Something went wrong while submitting. Please try again shortly.",
  },
  validation: {
    name: "Please enter your name.",
    nameMax: "Name must be 30 characters or fewer.",
    company: "Please enter the company name.",
    companyMax: "Company name must be 60 characters or fewer.",
    ceo: "Please enter the representative name.",
    ceoMax: "Representative name must be 30 characters or fewer.",
    phone: "Please enter a valid phone number.",
    email: "Please enter a valid email address.",
    interest: "Please enter your interests.",
    interestMax: "Interests must be 300 characters or fewer.",
    consent: "Please agree to the collection and use of personal information.",
    invalid: "Please check your input.",
  },
  api: {
    tooMany: "Too many requests. Please try again shortly.",
    badRequest: "Invalid request.",
    saveFailed: `Something went wrong while submitting. Please try again shortly or call ${ORG.phone} (Korea).`,
    paymentNotReady: "Online payment is not available yet.",
    orderNotFound: "We could not find your application. Please check your application number.",
    amountMismatch: "The payment amount does not match your application.",
    confirmFailed: `Something went wrong while confirming your payment. Please call ${ORG.phone} (Korea) with your application number.`,
  },
  payment: {
    checking: "Confirming your payment…",
    doneTitle: "Your payment is complete",
    doneBody: "We will send your membership confirmation to the email and phone number you provided.",
    failTitle: "Your payment was not completed",
    failBody: `The payment was cancelled or failed. Please try again or contact us. (${ORG.phone}, Korea)`,
    errorTitle: "Something went wrong while confirming your payment",
    errorBody: `Even if your payment went through, please don't worry. Contact us with your application number and we will check. (${ORG.phone}, Korea)`,
    orderId: "Application no.",
    retry: "Try again",
    home: "Back to home",
  },
  footer: {
    ceo: "CEO",
    bizNo: "Business Reg. No.",
    mailOrder: "Mail-order Business Reg. No.",
    address: "Address",
    tel: "Tel",
    email: "Email",
    terms: "Terms & Refund Policy",
    privacy: "Privacy Policy",
    rights: "All rights reserved.",
  },
  legal: {
    effective: "Effective",
    effectiveDate: "November 1, 2026",
    privacyTitle: "Privacy Policy",
    termsTitle: "Terms and Refund Policy",
  },
};
