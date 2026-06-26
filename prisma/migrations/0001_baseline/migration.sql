-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('DISTRIBUTEUR', 'PRO', 'LEADER');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OnboardingFlow" AS ENUM ('STANDARD', 'LICENCE_ONLY', 'LICENCE_WITH_MLM');

-- CreateEnum
CREATE TYPE "UserKind" AS ENUM ('LICENSEE', 'CLIENT');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PENDING', 'EARNED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('PROSPECT', 'CLIENT', 'PARTENAIRE');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TIKTOK', 'MANUEL', 'BOT_WHATSAPP', 'BOT_TELEGRAM', 'IMPORT', 'RDV_INBOUND');

-- CreateEnum
CREATE TYPE "PersonalityType" AS ENUM ('ROUGE', 'VERT', 'BLEU', 'JAUNE');

-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('NOUVEAU', 'CONTACTE', 'QUALIFIE', 'CHAUD');

-- CreateEnum
CREATE TYPE "ClientStage" AS ENUM ('C_NOUVEAU', 'C_PREMIERE', 'C_REGULIER', 'C_AMBASSADEUR');

-- CreateEnum
CREATE TYPE "PartnerStage" AS ENUM ('INTEGRATION', 'FORMATION', 'ACTIF', 'LEADER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('MOTEUR', 'ENROUTE', 'VEILLE', 'HORSATLINE');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CALL', 'VISIO', 'PRESENTIEL', 'WEBINAIRE', 'FORMATION', 'AUTRE');

-- CreateEnum
CREATE TYPE "AppointmentOutcome" AS ENUM ('POSITIF', 'NEUTRE', 'NEGATIF', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AtlasRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "LessonKind" AS ENUM ('LESSON', 'QUIZ');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'LECTURE', 'AUDIO');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('SINGLE', 'TRUEFALSE', 'MULTI', 'ORDER', 'SCENARIO');

-- CreateEnum
CREATE TYPE "ResourceCat" AS ENUM ('SCRIPT', 'FICHE', 'MODELE', 'REPLAY');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('LOCKED', 'CURRENT', 'DONE');

-- CreateEnum
CREATE TYPE "BookPriority" AS ENUM ('ESSENTIEL', 'COMPLEMENTAIRE');

-- CreateEnum
CREATE TYPE "RagStatus" AS ENUM ('A_INDEXER', 'EN_COURS', 'INDEXE');

-- CreateEnum
CREATE TYPE "SimPhase" AS ENUM ('INVITATION', 'SUIVI', 'DEMARRAGE', 'COACHING');

-- CreateEnum
CREATE TYPE "SimDiff" AS ENUM ('FACILE', 'MOYEN', 'DIFFICILE', 'PRO');

-- CreateEnum
CREATE TYPE "SimKnowledge" AS ENUM ('JAMAIS_FAIT', 'A_UN_AVIS', 'DEJA_FAIT_MLM');

-- CreateEnum
CREATE TYPE "SimRole" AS ENUM ('USER', 'ARIA');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'TWITTER');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('BROUILLON', 'PLANIFIE', 'PUBLIE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "InboxKind" AS ENUM ('DM', 'COMMENTAIRE', 'MESSAGE');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('NOUVEAU', 'PROSPECT', 'PARTENAIRE');

-- CreateEnum
CREATE TYPE "ProspectScore" AS ENUM ('CHAUD', 'TIEDE', 'FROID');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('GENERAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('ELIGIBLE', 'PAID', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PlacementMethod" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('RESIDUAL', 'FAST_START', 'RETENTION', 'LEADERSHIP');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SAAS', 'DIGITAL_APP');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PRECREATION', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ToolLinkType" AS ENUM ('BOUTIQUE', 'PARRAINAGE', 'RDV', 'WHATSAPP', 'WHATSAPP_GROUP', 'ZOOM', 'INSTAGRAM', 'FACEBOOK', 'TIKTOK');

-- CreateEnum
CREATE TYPE "SupportBucket" AS ENUM ('PRESENTER', 'FORMER', 'VENDRE');

-- CreateEnum
CREATE TYPE "ConvRole" AS ENUM ('USER', 'CONTACT');

-- CreateEnum
CREATE TYPE "MsgChannel" AS ENUM ('IN_APP', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'EMAIL');

-- CreateEnum
CREATE TYPE "BotCanal" AS ENUM ('WHATSAPP', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "BotConvStatus" AS ENUM ('ACTIVE', 'TAKEN_OVER', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BotMsgRole" AS ENUM ('PROSPECT', 'BOT');

-- CreateEnum
CREATE TYPE "BlogAgent" AS ENUM ('ATLAS', 'NOVA', 'HYBRID');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('PLANNED', 'GENERATING', 'REVIEW', 'PUBLISHED', 'OUTDATED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CONFERENCE', 'HOTEL_MEETING', 'WEBINAIRE', 'FORMATION', 'CONVENTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiRole" AS ENUM ('ATLAS_LLM', 'NOVA_LLM', 'ARIA_LLM', 'EMBEDDING', 'RERANKING');

-- CreateEnum
CREATE TYPE "AiAgent" AS ENUM ('ATLAS', 'NOVA', 'ARIA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "phone2" TEXT,
    "gender" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "postal" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'France',
    "photoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'DISTRIBUTEUR',
    "planBillingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "planStartedAt" TIMESTAMP(3),
    "planExpiresAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "kind" "UserKind" NOT NULL DEFAULT 'LICENSEE',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "level" INTEGER NOT NULL DEFAULT 1,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "bio" TEXT,
    "birthDate" TIMESTAMP(3),
    "hubVisible" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingFlow" "OnboardingFlow",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotif" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "mentions" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "activeCompanyId" TEXT,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "SubStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralConfig" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "referrerRewardMonths" INTEGER NOT NULL DEFAULT 1,
    "referredDiscountPct" INTEGER NOT NULL DEFAULT 50,
    "referredDiscountMonths" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReferral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "rewardSnapshot" JSONB,
    "rewardStatus" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMlmBusiness" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmName" TEXT NOT NULL,
    "mlmSlug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rank" TEXT,
    "goal" TEXT,
    "color" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMlmBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlmCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',

    CONSTRAINT "MlmCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "kind" "ContactKind" NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT,
    "accent" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "address2" TEXT,
    "postal" TEXT,
    "city" TEXT,
    "country" TEXT,
    "source" "ContactSource",
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "personality" "PersonalityType",
    "prospectStage" "ProspectStage",
    "clientStage" "ClientStage",
    "partnerStage" "PartnerStage",
    "score" INTEGER,
    "tags" TEXT[],
    "lastContact" TIMESTAMP(3),
    "note" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerExtra" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "team" INTEGER,
    "volume" DOUBLE PRECISION,
    "onAtline" BOOLEAN NOT NULL DEFAULT false,
    "appReferral" BOOLEAN NOT NULL DEFAULT false,
    "scoreAtline" INTEGER,
    "simSessions" INTEGER NOT NULL DEFAULT 0,
    "courseDone" INTEGER NOT NULL DEFAULT 0,
    "prospects" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" TIMESTAMP(3),
    "status" "PartnerStatus" NOT NULL DEFAULT 'VEILLE',

    CONSTRAINT "PartnerExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientExtra" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "panier" DOUBLE PRECISION,
    "frequency" TEXT,
    "lastBuy" TIMESTAMP(3),
    "reassortDue" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClientExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ContactImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "color" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'AUTRE',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "outcome" "AppointmentOutcome",
    "outcomeNote" TEXT,
    "atlasDebriefId" TEXT,
    "calComEventId" TEXT,
    "calComBookingUrl" TEXT,
    "linkedMlmEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalComConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calComUserId" TEXT NOT NULL,
    "bookingUrl" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalComConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlasConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT,
    "contactId" TEXT,
    "title" TEXT,
    "context" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtlasConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlasMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AtlasRole" NOT NULL,
    "content" TEXT NOT NULL,
    "qdrantChunks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlasMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "linkedContactId" TEXT,
    "linkedModuleId" TEXT,
    "linkedAppointmentId" TEXT,
    "linkedMlmEventId" TEXT,
    "linkedSimPhase" TEXT,
    "linkedPostId" TEXT,
    "linkedReportId" TEXT,
    "linkedBookId" TEXT,
    "linkedBotConvId" TEXT,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlasReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "highlights" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlasReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsCourse" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverColor" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "LessonKind" NOT NULL,
    "type" "LessonType",
    "title" TEXT NOT NULL,
    "content" JSONB,
    "durationMin" INTEGER,
    "summary" TEXT,
    "passThreshold" INTEGER,
    "intro" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LmsLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "type" "QuizType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER,
    "correctAnswers" INTEGER[],
    "correctBool" BOOLEAN,
    "correctOrder" INTEGER[],
    "lessonRef" TEXT,

    CONSTRAINT "LmsQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsResource" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT,
    "title" TEXT NOT NULL,
    "category" "ResourceCat" NOT NULL,
    "format" TEXT NOT NULL,
    "meta" TEXT,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLmsProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "pct" INTEGER NOT NULL DEFAULT 0,
    "status" "ModuleStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserLmsProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlmBook" (
    "id" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "priority" "BookPriority" NOT NULL,
    "auteur" TEXT NOT NULL,
    "titreFR" TEXT NOT NULL,
    "titreEN" TEXT,
    "theme" TEXT NOT NULL,
    "dispoFR" BOOLEAN NOT NULL DEFAULT true,
    "format" TEXT NOT NULL,
    "note" INTEGER NOT NULL,
    "amazonUrl" TEXT,
    "audibleUrl" TEXT,
    "ragStatus" "RagStatus" NOT NULL DEFAULT 'A_INDEXER',
    "ragIndexedAt" TIMESTAMP(3),
    "qdrantCollection" TEXT,

    CONSTRAINT "MlmBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBookInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phase" "SimPhase" NOT NULL,
    "characterId" TEXT NOT NULL,
    "difficulty" "SimDiff" NOT NULL,
    "knowledgeLevel" "SimKnowledge" NOT NULL DEFAULT 'JAMAIS_FAIT',
    "pipelineContactId" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SimSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "SimRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPillar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "pillarId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "PostStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "format" TEXT,
    "novaGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostAnalytics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "pillarId" TEXT,
    "title" TEXT NOT NULL,
    "platform" "SocialPlatform",
    "format" TEXT,
    "angle" TEXT,
    "novaGenerated" BOOLEAN NOT NULL DEFAULT false,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialInboxItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "senderName" TEXT NOT NULL,
    "kind" "InboxKind" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "status" "InboxStatus" NOT NULL DEFAULT 'NOUVEAU',
    "context" TEXT,
    "intent" TEXT,
    "score" "ProspectScore",
    "message" TEXT NOT NULL,
    "novaSuggestion" TEXT,
    "addedToCrmId" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialInboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumSpace" (
    "id" TEXT NOT NULL,
    "type" "SpaceType" NOT NULL,
    "mlmSlug" TEXT,

    CONSTRAINT "ForumSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumCategory" (
    "id" TEXT NOT NULL,
    "spaceType" "SpaceType" NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThread" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "mlmCompanyName" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ForumPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumSaved" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,

    CONSTRAINT "ForumSaved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "threadId" TEXT,
    "postId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlineReferral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlineReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "filleulId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "targetParentId" TEXT NOT NULL,
    "status" "PlacementStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "placedById" TEXT,
    "placedAt" TIMESTAMP(3),
    "method" "PlacementMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlineCommission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sourceUserId" TEXT,
    "sourceClientId" TEXT,
    "type" "CommissionType" NOT NULL,
    "level" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" DATE NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "blockedReason" TEXT,
    "receiverPlanAtTime" "Plan" NOT NULL,
    "sourcePlanAtTime" "Plan",
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlineCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionConfig" (
    "id" TEXT NOT NULL,
    "residualN1Rate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "residualN2Rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "fastStartRate" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "fastStartDays" INTEGER NOT NULL DEFAULT 30,
    "retentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "retentionMin" INTEGER NOT NULL DEFAULT 3,
    "retentionPct" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlineLicense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AtlineLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlineProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProductType" NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "appStoreUrl" TEXT,
    "playStoreUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PRECREATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlineProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseeProductCatalog" (
    "id" TEXT NOT NULL,
    "licenseeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseeProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppClient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "country" TEXT NOT NULL DEFAULT 'France',
    "productId" TEXT NOT NULL,
    "licenceeId" TEXT NOT NULL,
    "referrerId" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" "SubStatus" NOT NULL DEFAULT 'TRIALING',
    "convertedToUserId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolboxLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "linkType" "ToolLinkType" NOT NULL,
    "url" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolboxLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolboxSupport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "bucket" "SupportBucket" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolboxSupport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConvRole" NOT NULL,
    "content" TEXT NOT NULL,
    "channel" "MsgChannel" NOT NULL DEFAULT 'IN_APP',
    "atlasSuggestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProspectBot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canal" "BotCanal" NOT NULL,
    "tokenUnique" TEXT NOT NULL,
    "mlmBusinessId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "botName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectBot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotLandingSession" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "canal" "BotCanal" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotLandingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConversation" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "externalId" TEXT,
    "landingSessionId" TEXT,
    "prospectName" TEXT,
    "prospectPhone" TEXT,
    "score" "ProspectScore",
    "status" "BotConvStatus" NOT NULL DEFAULT 'ACTIVE',
    "addedToCrmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotMessage" (
    "id" TEXT NOT NULL,
    "convId" TEXT NOT NULL,
    "role" "BotMsgRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "go" TEXT NOT NULL,
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "seenAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleRegistry" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "agent" "BlogAgent" NOT NULL,
    "statut" "ArticleStatus" NOT NULL DEFAULT 'PLANNED',
    "qdrantSources" TEXT[],
    "ghostId" TEXT,
    "ghostUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "needsUpdate" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlmEvent" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "mlmSlug" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "onlineUrl" TEXT,
    "maxAttendees" INTEGER,
    "registrationUrl" TEXT,
    "highlightedByAtlas" BOOLEAN NOT NULL DEFAULT false,
    "atlineOnly" BOOLEAN NOT NULL DEFAULT false,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedToCalendar" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtlasMantras" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtlasMantras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConfig" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkCode" TEXT,

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "role" "AiRole" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "maxTokens" INTEGER,
    "temperature" DOUBLE PRECISION,
    "extraParams" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "agent" "AiAgent" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DOUBLE PRECISION,
    "langfuseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageMonthly" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agent" "AiAgent" NOT NULL,
    "month" DATE NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsageMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiQuotaConfig" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "agent" "AiAgent" NOT NULL,
    "monthlyTokens" INTEGER,
    "hardLimit" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AiQuotaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RagTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'coaching',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "model" TEXT,
    "voiceId" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_token_key" ON "EmailVerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StripeSubscription_userId_key" ON "StripeSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeSubscription_stripeSubId_key" ON "StripeSubscription"("stripeSubId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReferral_referrerId_referredId_key" ON "UserReferral"("referrerId", "referredId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMlmBusiness_userId_mlmSlug_key" ON "UserMlmBusiness"("userId", "mlmSlug");

-- CreateIndex
CREATE UNIQUE INDEX "MlmCatalog_name_key" ON "MlmCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MlmCatalog_slug_key" ON "MlmCatalog"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerExtra_contactId_key" ON "PartnerExtra"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientExtra_contactId_key" ON "ClientExtra"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_calComEventId_key" ON "Appointment"("calComEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalComConnection_userId_key" ON "CalComConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlan_userId_mlmBusinessId_date_key" ON "DailyPlan"("userId", "mlmBusinessId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LmsModule_courseId_position_key" ON "LmsModule"("courseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LmsLesson_moduleId_position_key" ON "LmsLesson"("moduleId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LmsQuestion_lessonId_position_key" ON "LmsQuestion"("lessonId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "UserLmsProgress_userId_moduleId_key" ON "UserLmsProgress"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_moduleId_key" ON "Certificate"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "MlmBook_rang_key" ON "MlmBook"("rang");

-- CreateIndex
CREATE UNIQUE INDEX "UserBookInteraction_userId_bookId_key" ON "UserBookInteraction"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPillar_userId_mlmBusinessId_label_key" ON "ContentPillar"("userId", "mlmBusinessId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "PostAnalytics_postId_key" ON "PostAnalytics"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_key" ON "SocialAccount"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ForumCategory_spaceType_slug_key" ON "ForumCategory"("spaceType", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPostLike_postId_userId_key" ON "ForumPostLike"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumSaved_userId_threadId_key" ON "ForumSaved"("userId", "threadId");

-- CreateIndex
CREATE UNIQUE INDEX "AtlineReferral_referrerId_referredId_key" ON "AtlineReferral"("referrerId", "referredId");

-- CreateIndex
CREATE UNIQUE INDEX "AtlineLicense_userId_key" ON "AtlineLicense"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AtlineProduct_slug_key" ON "AtlineProduct"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseeProductCatalog_licenseeId_productId_key" ON "LicenseeProductCatalog"("licenseeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "AppClient_email_key" ON "AppClient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppClient_stripeCustomerId_key" ON "AppClient"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "AppClient_convertedToUserId_key" ON "AppClient"("convertedToUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolboxLink_userId_mlmBusinessId_linkType_key" ON "ToolboxLink"("userId", "mlmBusinessId", "linkType");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_contactId_key" ON "Conversation"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_userId_contactId_key" ON "Conversation"("userId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectBot_tokenUnique_key" ON "ProspectBot"("tokenUnique");

-- CreateIndex
CREATE UNIQUE INDEX "ProspectBot_userId_canal_key" ON "ProspectBot"("userId", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "BotLandingSession_sessionKey_key" ON "BotLandingSession"("sessionKey");

-- CreateIndex
CREATE UNIQUE INDEX "BotConversation_landingSessionId_key" ON "BotConversation"("landingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "BotConversation_botId_externalId_key" ON "BotConversation"("botId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentConfig_agent_key_key" ON "AgentConfig"("agent", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_telegramChatId_key" ON "TelegramLink"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_userId_key" ON "TelegramLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderConfig_role_priority_key" ON "AiProviderConfig"("role", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsageMonthly_userId_agent_month_key" ON "AiUsageMonthly"("userId", "agent", "month");

-- CreateIndex
CREATE UNIQUE INDEX "AiQuotaConfig_plan_agent_key" ON "AiQuotaConfig"("plan", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "RagTag_name_key" ON "RagTag"("name");

-- CreateIndex
CREATE INDEX "AudioAsset_kind_entityId_idx" ON "AudioAsset"("kind", "entityId");

-- CreateIndex
CREATE INDEX "AudioAsset_kind_isPublished_idx" ON "AudioAsset"("kind", "isPublished");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeSubscription" ADD CONSTRAINT "StripeSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferral" ADD CONSTRAINT "UserReferral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMlmBusiness" ADD CONSTRAINT "UserMlmBusiness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerExtra" ADD CONSTRAINT "PartnerExtra_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientExtra" ADD CONSTRAINT "ClientExtra_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactImportBatch" ADD CONSTRAINT "ContactImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactImportBatch" ADD CONSTRAINT "ContactImportBatch_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_atlasDebriefId_fkey" FOREIGN KEY ("atlasDebriefId") REFERENCES "AtlasConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalComConnection" ADD CONSTRAINT "CalComConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasConversation" ADD CONSTRAINT "AtlasConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasConversation" ADD CONSTRAINT "AtlasConversation_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasConversation" ADD CONSTRAINT "AtlasConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasMessage" ADD CONSTRAINT "AtlasMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AtlasConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPlan" ADD CONSTRAINT "DailyPlan_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTask" ADD CONSTRAINT "DailyTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasReport" ADD CONSTRAINT "AtlasReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlasReport" ADD CONSTRAINT "AtlasReport_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsModule" ADD CONSTRAINT "LmsModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsLesson" ADD CONSTRAINT "LmsLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsQuestion" ADD CONSTRAINT "LmsQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsResource" ADD CONSTRAINT "LmsResource_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLmsProgress" ADD CONSTRAINT "UserLmsProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLmsProgress" ADD CONSTRAINT "UserLmsProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAttempt" ADD CONSTRAINT "UserQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAttempt" ADD CONSTRAINT "UserQuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LmsLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookInteraction" ADD CONSTRAINT "UserBookInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookInteraction" ADD CONSTRAINT "UserBookInteraction_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "MlmBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimSession" ADD CONSTRAINT "SimSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimMessage" ADD CONSTRAINT "SimMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SimSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPillar" ADD CONSTRAINT "ContentPillar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPillar" ADD CONSTRAINT "ContentPillar_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "ContentPillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostAnalytics" ADD CONSTRAINT "PostAnalytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentIdea" ADD CONSTRAINT "ContentIdea_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "ContentPillar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInboxItem" ADD CONSTRAINT "SocialInboxItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialInboxItem" ADD CONSTRAINT "SocialInboxItem_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "ForumSpace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLike" ADD CONSTRAINT "ForumPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLike" ADD CONSTRAINT "ForumPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumSaved" ADD CONSTRAINT "ForumSaved_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumSaved" ADD CONSTRAINT "ForumSaved_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ContentPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineReferral" ADD CONSTRAINT "AtlineReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineReferral" ADD CONSTRAINT "AtlineReferral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_filleulId_fkey" FOREIGN KEY ("filleulId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_targetParentId_fkey" FOREIGN KEY ("targetParentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineCommission" ADD CONSTRAINT "AtlineCommission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineCommission" ADD CONSTRAINT "AtlineCommission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtlineProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineCommission" ADD CONSTRAINT "AtlineCommission_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineCommission" ADD CONSTRAINT "AtlineCommission_sourceClientId_fkey" FOREIGN KEY ("sourceClientId") REFERENCES "AppClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtlineLicense" ADD CONSTRAINT "AtlineLicense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseeProductCatalog" ADD CONSTRAINT "LicenseeProductCatalog_licenseeId_fkey" FOREIGN KEY ("licenseeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LicenseeProductCatalog" ADD CONSTRAINT "LicenseeProductCatalog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtlineProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppClient" ADD CONSTRAINT "AppClient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtlineProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppClient" ADD CONSTRAINT "AppClient_licenceeId_fkey" FOREIGN KEY ("licenceeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppClient" ADD CONSTRAINT "AppClient_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "AppClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolboxLink" ADD CONSTRAINT "ToolboxLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolboxLink" ADD CONSTRAINT "ToolboxLink_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolboxSupport" ADD CONSTRAINT "ToolboxSupport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolboxSupport" ADD CONSTRAINT "ToolboxSupport_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectBot" ADD CONSTRAINT "ProspectBot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProspectBot" ADD CONSTRAINT "ProspectBot_mlmBusinessId_fkey" FOREIGN KEY ("mlmBusinessId") REFERENCES "UserMlmBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotLandingSession" ADD CONSTRAINT "BotLandingSession_botId_fkey" FOREIGN KEY ("botId") REFERENCES "ProspectBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotConversation" ADD CONSTRAINT "BotConversation_botId_fkey" FOREIGN KEY ("botId") REFERENCES "ProspectBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotConversation" ADD CONSTRAINT "BotConversation_landingSessionId_fkey" FOREIGN KEY ("landingSessionId") REFERENCES "BotLandingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotMessage" ADD CONSTRAINT "BotMessage_convId_fkey" FOREIGN KEY ("convId") REFERENCES "BotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlmEvent" ADD CONSTRAINT "MlmEvent_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlmEvent" ADD CONSTRAINT "MlmEvent_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "MlmEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLink" ADD CONSTRAINT "TelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageMonthly" ADD CONSTRAINT "AiUsageMonthly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

