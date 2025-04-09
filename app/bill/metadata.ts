import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Your Bill Analysis Results",
    description:
        "View your detailed electricity bill analysis and see how much you could save with solar energy solutions.",
    openGraph: {
        title: "Your Solar Savings Analysis",
        description:
            "See your personalized solar savings analysis and recommended solutions.",
        images: [
            {
                url: "/bill-og.jpg",
                width: 1200,
                height: 630,
                alt: "Bill Analysis Results",
            },
        ],
    },
};
