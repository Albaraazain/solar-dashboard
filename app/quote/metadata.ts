import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Your Solar Solution Quote",
    description:
        "View your personalized solar solution quote and ROI analysis. See how much you can save with our solar installations.",
    openGraph: {
        title: "Your Personalized Solar Quote",
        description:
            "Get your detailed solar installation quote with ROI analysis and savings breakdown.",
        images: [
            {
                url: "/quote-og.jpg",
                width: 1200,
                height: 630,
                alt: "Solar Installation Quote",
            },
        ],
    },
};
