IF OBJECT_ID(N'publicapi.PlayerSheetOverrides', N'U') IS NULL
BEGIN
    CREATE TABLE publicapi.PlayerSheetOverrides (
        PlayerId nvarchar(160) NOT NULL CONSTRAINT PK_PublicApi_PlayerSheetOverrides PRIMARY KEY,
        SheetJson nvarchar(max) NOT NULL,
        UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_PublicApi_PlayerSheetOverrides_UpdatedAtUtc DEFAULT SYSUTCDATETIME()
    );
END
GO

IF N'$(FunctionAppName)' <> N''
BEGIN
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'$(FunctionAppName)')
        BEGIN
            EXEC(N'CREATE USER [$(FunctionAppName)] FROM EXTERNAL PROVIDER');
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.database_role_members drm
            INNER JOIN sys.database_principals role_principal ON role_principal.principal_id = drm.role_principal_id
            INNER JOIN sys.database_principals member_principal ON member_principal.principal_id = drm.member_principal_id
            WHERE role_principal.name = N'db_datareader'
                AND member_principal.name = N'$(FunctionAppName)'
        )
        BEGIN
            ALTER ROLE db_datareader ADD MEMBER [$(FunctionAppName)];
        END

        IF NOT EXISTS (
            SELECT 1
            FROM sys.database_role_members drm
            INNER JOIN sys.database_principals role_principal ON role_principal.principal_id = drm.role_principal_id
            INNER JOIN sys.database_principals member_principal ON member_principal.principal_id = drm.member_principal_id
            WHERE role_principal.name = N'db_datawriter'
                AND member_principal.name = N'$(FunctionAppName)'
        )
        BEGIN
            ALTER ROLE db_datawriter ADD MEMBER [$(FunctionAppName)];
        END
    END TRY
    BEGIN CATCH
        PRINT N'Could not grant SQL access to managed identity $(FunctionAppName): ' + ERROR_MESSAGE();
    END CATCH
END
GO
