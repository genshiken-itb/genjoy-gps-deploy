import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";

import { z } from "zod";

export const questRouter = createTRPCRouter({
  getAllNotTakenSideQuests: protectedProcedure.query(async ({ ctx }) => {
    // Get all quests that the user has not completed
    return await ctx.db.quest.findMany({
      where: {
        QuestEnrollment: {
          none: {
            userId: ctx.session.user.id,
            completedAt: { not: null },
          },
        },
      },
    });
  }),

  getAllTakenSideQuests: protectedProcedure.query(async ({ ctx }) => {
    // Get all quests that the user has completed
    return await ctx.db.questEnrollment.findMany({
      where: {
        userId: ctx.session.user.id,
        completedAt: { not: null },
      },
      include: {
        quest: true,
      },
    });
  }),

  getUserScore: protectedProcedure.query(async ({ ctx }) => {
    // Get the user's score
    const quests = await ctx.db.questEnrollment.findMany({
      where: {
        userId: ctx.session.user.id,
        completedAt: { not: null },
        proof: { not: null },
      },
      include: {
        quest: true,
      },
    });

    return quests.reduce((acc, quest) => {
      return acc + (quest.quest.points ?? 0);
    }, 0);
  }),

  getMaxScore: protectedProcedure.query(async ({ ctx }) => {
    // Get the maximum score
    const quests = await ctx.db.quest.findMany();

    return quests.reduce((acc, quest) => {
      return acc + (quest.points ?? 0);
    }, 0);

  }),

  takeQuest: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      // Mark a quest as completed by the user
      return ctx.db.questEnrollment.upsert({
        where: {
          userId_questId: {
            userId: ctx.session.user.id,
            questId: id,
          },
        },
        update: {
          completedAt: new Date(),
        },
        create: {
          userId: ctx.session.user.id,
          questId: id,
          completedAt: new Date(),
        },
      });
    }),

  untakeQuest: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: id }) => {
      // Mark a quest as not completed by the user
      return ctx.db.questEnrollment.update({
        where: {
          userId_questId: {
            userId: ctx.session.user.id,
            questId: id,
          },
        },
        data: {
          completedAt: null,
        },
      });
    }),

  uploadProof: protectedProcedure
    .input(z.object({
      questId: z.string(),
      image: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Upload proof of quest completion
      return ctx.db.questEnrollment.update({
        where: {
          userId_questId: {
            userId: ctx.session.user.id,
            questId: input.questId,
          },
        },
        data: {
          proof: input.image,
        },
      });
    }),

});