SELECT * FROM alkemio.lifecycle;
SELECT * FROM alkemio.lifecycle where machineState = '' or machineState is null;
SELECT * FROM alkemio.lifecycle where machineDef = '' or machineDef is null;