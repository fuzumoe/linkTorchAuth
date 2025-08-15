declare type DatabaseType =
    | 'aurora-mysql'
    | 'postgres'
    | 'cockroachdb'
    | 'sqlite'
    | 'mssql'
    | 'sap'
    | 'oracle'
    | 'cordova'
    | 'nativescript'
    | 'react-native'
    | 'sqljs'
    | 'mongodb';

declare type CookieSameSitePolicy = 'strict' | 'lax' | 'none';

declare type CookieOptions = {
    secure: boolean;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
    path: string;
    httpOnly: boolean;
    sameSite: CookieSameSitePolicy;
    maxAge: number;
};
