import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../src/server/prisma";
import { canManageCms, deny, getActor } from "@/server/rbac";

const DEMO_BLOG_POSTS = [
    {
        title: "How to Read Fare Rules Before You Book",
        tag: "Fare Rules",
        excerpt: "A practical breakdown of change penalties, refund clauses, no-show conditions, and what matters before you pay.",
        content: "Fare rules decide whether a ticket is flexible, refundable, or expensive to change. Before issuing, verify change fees, cancellation windows, no-show restrictions, baggage policy, and the exact brand terms attached to the offer. A cheap fare can become expensive after one date change, so policy reading is part of price comparison.",
        imageUrl: "https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
    {
        title: "Best Time Windows for Lower International Fares",
        tag: "Travel Tips",
        excerpt: "When demand shifts, fares move fast. This guide explains the search windows that usually produce cleaner pricing.",
        content: "International fares usually behave best when searched with enough lead time and flexible departure windows. Compare nearby travel dates, midweek departures, and alternate return lengths. Strong search discipline beats reactive booking, especially for high-demand routes.",
        imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
    {
        title: "Transit Strategy: Short vs Long Connection",
        tag: "Travel Tech",
        excerpt: "Connection time is not only about convenience. It changes risk, rebooking exposure, and the overall travel experience.",
        content: "Short transits reduce total trip duration but increase disruption risk. Longer transits add safety margin but may increase terminal changes or visa considerations. Evaluate airport size, terminal layout, baggage transfer rules, and schedule reliability before choosing an itinerary.",
        imageUrl: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
    {
        title: "Baggage Policy Differences Across Major Carriers",
        tag: "Airline Updates",
        excerpt: "Two itineraries can look identical on price while baggage rules differ sharply. That difference matters at check-in.",
        content: "Always inspect carry-on allowance, checked baggage weight, piece concept, and brand-specific restrictions. Some fares exclude checked baggage entirely, while others include flexible cabin and baggage combinations that justify a slightly higher base fare.",
        imageUrl: "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
    {
        title: "Multi-City Booking: Mistakes That Cost More",
        tag: "Destination",
        excerpt: "Multi-city trips reward planning, but small mistakes in sequence and layover choice can raise the fare quickly.",
        content: "For multi-city travel, verify segment order, connection legality, stopover intention, fare brand continuity, and baggage transfer rules. Small structural issues often create separate ticket risk or expensive repricing at issuance time.",
        imageUrl: "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
    {
        title: "Booking Confidence: What to Verify Pre-Ticketing",
        tag: "News",
        excerpt: "A quick final checklist before issue protects travelers from common booking mistakes and last-minute surprises.",
        content: "Before ticketing, verify name spelling, passport match, fare rule acceptance, baggage, route timing, contact details, and total payable amount. Final review is a high-value step because ticketed mistakes are usually harder and more expensive to fix.",
        imageUrl: "https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=1200&q=80",
        authorName: "FlyJatt Team",
    },
];

async function seedDemoPosts() {
    const existingTitles = new Set(
        (await prisma.blogPost.findMany({ select: { title: true } })).map((row) => row.title)
    );
    const rowsToCreate = DEMO_BLOG_POSTS.filter((row) => !existingTitles.has(row.title));
    if (!rowsToCreate.length) return { inserted: 0 };

    await prisma.blogPost.createMany({
        data: rowsToCreate.map((row) => ({
            ...row,
            published: true,
        })),
    });

    return { inserted: rowsToCreate.length };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        try {
            const adminMode = req.query.admin === "true";
            if (!adminMode) {
                res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1200");
            }
            if (adminMode) {
                const actor = await getActor(req);
                if (!canManageCms(actor)) {
                    return deny(res, "Only Super Admin/Admin/Manager can access admin blog list");
                }
            }
            const posts = await prisma.blogPost.findMany({
                where: adminMode ? {} : { published: true },
                orderBy: { createdAt: "desc" },
            });
            return res.status(200).json(posts);
        } catch (err) {
            console.error("[cms/blog GET]", err);
            return res.status(500).json({ message: "Failed to fetch blog posts" });
        }
    }

    if (req.method === "POST") {
        try {
            const actor = await getActor(req);
            if (!canManageCms(actor)) {
                return deny(res, "Only Super Admin/Admin/Manager can create blog posts");
            }
            if (req.body?.action === "seed-demo") {
                const result = await seedDemoPosts();
                const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } });
                return res.status(200).json({
                    message: result.inserted ? `Inserted ${result.inserted} demo posts.` : "Demo posts already exist.",
                    inserted: result.inserted,
                    posts,
                });
            }
            const { title, tag, excerpt, content, imageUrl, published, authorName } = req.body ?? {};
            if (!title || !title.trim()) {
                return res.status(400).json({ message: "Title is required" });
            }
            const post = await prisma.blogPost.create({
                data: {
                    title: String(title).trim(),
                    tag: String(tag ?? "Travel Tips").trim(),
                    excerpt: excerpt ? String(excerpt).trim() : null,
                    content: content ? String(content).trim() : null,
                    imageUrl: imageUrl ? String(imageUrl).trim() : null,
                    published: published !== false,
                    authorName: authorName ? String(authorName).trim() : "FlyJatt Team",
                },
            });
            return res.status(201).json(post);
        } catch (err) {
            console.error("[cms/blog POST]", err);
            return res.status(500).json({ message: "Failed to create blog post" });
        }
    }

    if (req.method === "PUT") {
        try {
            const actor = await getActor(req);
            if (!canManageCms(actor)) {
                return deny(res, "Only Super Admin/Admin/Manager can update blog posts");
            }
            const id = Number(req.query.id);
            if (!id) return res.status(400).json({ message: "Missing id" });
            const { title, tag, excerpt, content, imageUrl, published, authorName } = req.body ?? {};
            const post = await prisma.blogPost.update({
                where: { id },
                data: {
                    ...(title !== undefined && { title: String(title).trim() }),
                    ...(tag !== undefined && { tag: String(tag).trim() }),
                    ...(excerpt !== undefined && { excerpt: String(excerpt).trim() }),
                    ...(content !== undefined && { content: String(content).trim() }),
                    ...(imageUrl !== undefined && { imageUrl: String(imageUrl).trim() }),
                    ...(published !== undefined && { published: Boolean(published) }),
                    ...(authorName !== undefined && { authorName: String(authorName).trim() }),
                },
            });
            return res.status(200).json(post);
        } catch (err) {
            console.error("[cms/blog PUT]", err);
            return res.status(500).json({ message: "Failed to update blog post" });
        }
    }

    if (req.method === "DELETE") {
        try {
            const actor = await getActor(req);
            if (!canManageCms(actor)) {
                return deny(res, "Only Super Admin/Admin/Manager can delete blog posts");
            }
            const id = Number(req.query.id);
            if (!id) return res.status(400).json({ message: "Missing id" });
            await prisma.blogPost.delete({ where: { id } });
            return res.status(200).json({ message: "Deleted" });
        } catch (err) {
            console.error("[cms/blog DELETE]", err);
            return res.status(500).json({ message: "Failed to delete blog post" });
        }
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
}

export default withApiHandler(handler, { methods: ["GET", "POST", "PUT", "DELETE"] });

export const config = { api: { bodyParser: false } };
