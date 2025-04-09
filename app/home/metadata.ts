import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Solar Bill Analysis - Save with Smart Energy Solutions",
    description:
        "Upload your electricity bill and discover your potential savings with solar energy. Get personalized recommendations and instant quotes for your home.",
    openGraph: {
        title: "Analyze Your Bill & Save with Solar Energy",
        description:
            "Transform your electricity costs with smart solar solutions. Get instant analysis and savings estimates.",
        images: [
            {
                url: "/home-og.jpg",
                width: 1200,
                height: 630,
                alt: "EnergyCove Solar Analysis",
            },
        ],
    },
};
