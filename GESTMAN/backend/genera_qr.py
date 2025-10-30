import qrcode

import os
url = "http://172.16.1.16:5173/"
img = qrcode.make(url)
output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "AAMANUTENZIONE_QR.png")
img.save(output_path)
print(f"QR code generato: {output_path}")
