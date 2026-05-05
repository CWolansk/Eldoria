IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'publicapi')
BEGIN
    EXEC(N'CREATE SCHEMA publicapi');
END
GO

IF OBJECT_ID(N'publicapi.Players', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.Players (
        PlayerId nvarchar(160) NOT NULL CONSTRAINT PK_PublicApi_Players PRIMARY KEY,
        Name nvarchar(200) NOT NULL,
        SheetTitle nvarchar(240) NULL,
        Class nvarchar(120) NULL,
        Level int NOT NULL CONSTRAINT DF_PublicApi_Players_Level DEFAULT 1,
        Race nvarchar(120) NULL,
        Background nvarchar(160) NULL,
        PortraitUrl nvarchar(500) NULL,
        Experience int NULL,
        GuildPoints int NULL,
        GuildRank nvarchar(60) NULL,
        ArmorClass int NULL,
        Speed int NULL,
        MaxHp int NULL,
        CurrentHp int NULL,
        ProficiencyBonus int NULL,
        Initiative int NULL,
        SpellcastingAbility nvarchar(12) NULL,
        SpellAttack int NULL,
        SpellSaveDc int NULL,
        SimpleWeapons bit NOT NULL CONSTRAINT DF_PublicApi_Players_SimpleWeapons DEFAULT 0,
        MartialWeapons bit NOT NULL CONSTRAINT DF_PublicApi_Players_MartialWeapons DEFAULT 0,
        NotesUrl nvarchar(500) NULL,
        ClassUrl nvarchar(500) NULL,
        SourceUrl nvarchar(500) NULL,
        SearchText nvarchar(max) NULL,
        UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_PublicApi_Players_UpdatedAtUtc DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID(N'publicapi.PlayerAbilities', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.PlayerAbilities (
        PlayerId nvarchar(160) NOT NULL,
        Ability nvarchar(12) NOT NULL,
        Score int NOT NULL,
        CONSTRAINT PK_PublicApi_PlayerAbilities PRIMARY KEY (PlayerId, Ability),
        CONSTRAINT FK_PublicApi_PlayerAbilities_Player FOREIGN KEY (PlayerId)
            REFERENCES publicapi.Players(PlayerId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'publicapi.PlayerLists', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.PlayerLists (
        PlayerId nvarchar(160) NOT NULL,
        ListType nvarchar(40) NOT NULL,
        SortOrder int NOT NULL,
        Value nvarchar(300) NOT NULL,
        CONSTRAINT PK_PublicApi_PlayerLists PRIMARY KEY (PlayerId, ListType, SortOrder),
        CONSTRAINT FK_PublicApi_PlayerLists_Player FOREIGN KEY (PlayerId)
            REFERENCES publicapi.Players(PlayerId) ON DELETE CASCADE
    );
END
GO

IF OBJECT_ID(N'publicapi.PublicEntities', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.PublicEntities (
        EntityId nvarchar(240) NOT NULL CONSTRAINT PK_PublicApi_PublicEntities PRIMARY KEY,
        Name nvarchar(240) NOT NULL,
        EntityType nvarchar(80) NULL,
        Region nvarchar(120) NULL,
        Location nvarchar(160) NULL,
        TagsJson nvarchar(max) NULL,
        SourcePath nvarchar(500) NULL,
        SourceUrl nvarchar(500) NULL,
        Summary nvarchar(1000) NULL,
        UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_PublicApi_PublicEntities_UpdatedAtUtc DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID(N'publicapi.SearchDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.SearchDocuments (
        DocumentId nvarchar(240) NOT NULL CONSTRAINT PK_PublicApi_SearchDocuments PRIMARY KEY,
        Title nvarchar(240) NOT NULL,
        EntityType nvarchar(80) NULL,
        Region nvarchar(120) NULL,
        Location nvarchar(160) NULL,
        SourceUrl nvarchar(500) NULL,
        Summary nvarchar(1000) NULL,
        SearchText nvarchar(max) NULL,
        UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_PublicApi_SearchDocuments_UpdatedAtUtc DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PublicApi_PublicEntities_TypeRegionLocation' AND object_id = OBJECT_ID(N'publicapi.PublicEntities'))
BEGIN
    CREATE INDEX IX_PublicApi_PublicEntities_TypeRegionLocation
        ON publicapi.PublicEntities(EntityType, Region, Location);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PublicApi_SearchDocuments_Filters' AND object_id = OBJECT_ID(N'publicapi.SearchDocuments'))
BEGIN
    CREATE INDEX IX_PublicApi_SearchDocuments_Filters
        ON publicapi.SearchDocuments(EntityType, Region, Location);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PublicApi_PlayerLists_Type' AND object_id = OBJECT_ID(N'publicapi.PlayerLists'))
BEGIN
    CREATE INDEX IX_PublicApi_PlayerLists_Type
        ON publicapi.PlayerLists(ListType, Value);
END
GO
