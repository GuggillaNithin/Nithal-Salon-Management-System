$ErrorActionPreference = "Stop"

$outDir = "C:\Users\Maple Edge\Downloads\nitin workspace\salon-saas\stitch-assets"
if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$screens = @(
    @{
        name = "1_Customer_Management"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2JlYjY0NzFlNjEzNjRlZmNhNDg4ZDYzZTM4YTYwNTQ4EgsSBxD8hY2l8goYAZIBIwoKcHJvamVjdF9pZBIVQhM4NTMzNzI5MTUxMjc3NzM4MDkx&filename=&opi=89354086"
        image = "https://lh3.googleusercontent.com/aida/ADBb0uiRbyLiIjK6DeD3Qoo3v1oayjLIhxlT3rsVrwfZF6nXuyaQkBlQhZXFL7rGKqkMu1ebSu_rS3gaH48s58VM2jV07xUcHoN-xW3dPwOeL-acAL6f0eJzWZsnIBssEuTG-z7EV1kqTmS0yzzDK8BDlL80jQ9yOaRS4YtdA19pu4zl-2UkcxNU6VpxnnkBAu1EDmFH-VixlrDKj2B3DUFNjGl9cKhnIXOczlZWIfPBcpRXzEdlhkMKmBw2vrM"
    },
    @{
        name = "2_Business_Reports"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2I1OGQxNTk1MDIxYTQzMGJiMjU2MzIyNGJkNmM1YTg3EgsSBxD8hY2l8goYAZIBIwoKcHJvamVjdF9pZBIVQhM4NTMzNzI5MTUxMjc3NzM4MDkx&filename=&opi=89354086"
        image = "https://lh3.googleusercontent.com/aida/ADBb0uhZpeSH0kVRiZDpW_kP3phVf1qzAePA3Z81giX4VVRbTJkFA2W7ZfJGp5c4Z0-VpHtwEBbVopWPK6jBiU0ZSTNZwptXKmHpsR5YXjux1ymWLmC498F8R8w3oHCaZomJQu4ZSC1QIVTTZfKX7XPVda9HYeeCrtYRRYIWEGmbfpDK5ZRbRoK0Jx1H8030fil4O19x1gz5pOLdeXeGUv9hxKCT8xEZAe_LTXSV0aV5jbKXkwHpl9xZOlk14w"
    },
    @{
        name = "3_Services_Management"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzdhYjRhZjdlYjdlOTQzY2M4ODI4YmM0ODRiZTQ1NDRmEgsSBxD8hY2l8goYAZIBIwoKcHJvamVjdF9pZBIVQhM4NTMzNzI5MTUxMjc3NzM4MDkx&filename=&opi=89354086"
        image = "https://lh3.googleusercontent.com/aida/ADBb0ujVpcUOkp3gwvq4oi5XKzWm2O_iufM3TnlrrAg_TQojid-j9QvA3e0yPFmnxUm66ITPjVjdDomksfNJIftlofXvemociovsrt8CTH4eBonPuw3hV0Bjo0gs8D90Elpfq5Ly4IjHGHghp9yxE5zRp41LPaZ56WpiYm7aRPVFtgdxvAdFfI04lpaf-XKEQmlUsZvf_Z16p6Wppm7iHkCc5gvk5oRdO-7CjIOU0OxYg0m4FMXqCW0zFii5VA"
    },
    @{
        name = "4_Point_of_Sale"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzQ4N2RmY2QxNjcwZDRkMmViNjMxMjY2MTBhYmMxMjc3EgsSBxD8hY2l8goYAZIBIwoKcHJvamVjdF9pZBIVQhM4NTMzNzI5MTUxMjc3NzM4MDkx&filename=&opi=89354086"
        image = "https://lh3.googleusercontent.com/aida/ADBb0uiu4osRGS3HmWeBSrt3WD5BoEQdRFkfvCzF1U-rTAfu7nQe7XwYi3Fkh9F_IQ0N-Jt_WQgytOHk8hhjRiCiGqMoyi6LeAyRMxCPmGhldUpxOdaK9kGvj7Fi4YGoCzpH6y72eIyBahnWPCSuN4Th0pcVZFTR5MuHn514p_adPu5YVgjkFMKMS8OEZSp4x-mzIeTzCHyl59N6ja6RArT0sB4oHRocfnbpnj1xRCZIkKHPBciqGMlZjQxReN8"
    },
    @{
        name = "5_Employees_Management"
        html = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzBhNTcwNjJmYWRhZjRlZTQ5Mjc1MmU5NWI2YmY3NWMyEgsSBxD8hY2l8goYAZIBIwoKcHJvamVjdF9pZBIVQhM4NTMzNzI5MTUxMjc3NzM4MDkx&filename=&opi=89354086"
        image = "https://lh3.googleusercontent.com/aida/ADBb0uhx8AVia3Hon0KSslBNzVMjkQYhaHUwYfEWpamRapQNGWyQSKuu_wAQAFbhOInajBe5-lgQ7dQUI_qR-6XVwm6769BDtpSdAlIXQs8u16F8iNJlu_PAim6opBhQ7u0cuHY3LlobLuL0klPZkvXAt-1vUDk45Vhy3XB-StfnkB_o8Z7BcxFUOk0LRuON79yjltKjMkOIA6gnXmflsAMTte6EsxPtIxxAu6NW3mn7FU9AbxUyd-c-0GcBFpI"
    }
)

foreach ($screen in $screens) {
    Write-Host "Downloading $($screen.name)..."
    $htmlPath = Join-Path $outDir "$($screen.name).html"
    $imgPath = Join-Path $outDir "$($screen.name).png"
    
    Invoke-WebRequest -Uri $screen.html -OutFile $htmlPath
    Invoke-WebRequest -Uri $screen.image -OutFile $imgPath
}

Write-Host "All assets downloaded to $outDir"
