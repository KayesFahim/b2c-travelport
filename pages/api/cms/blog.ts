import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../src/server/prisma";
import { canManageCms, deny, getActor } from "@/server/rbac";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        try {
            const adminMode = req.query.admin === "true";
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
